import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class PdfGeneratorPage extends StatefulWidget {
  final InspectionTask? initialTask;
  const PdfGeneratorPage({super.key, this.initialTask});

  @override
  State<PdfGeneratorPage> createState() => _PdfGeneratorPageState();
}

class _PdfGeneratorPageState extends State<PdfGeneratorPage> {
  final InspectionService _inspectionService = InspectionService();
  List<InspectionTask> _allTasks = [];
  InspectionTask? _selectedTask;
  String _noticeType = 'Inspection Certificate'; // 'Inspection Certificate' or 'Notice of Violation'
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final active = await _inspectionService.getMyTasks();
      final history = await _inspectionService.getMyReportHistory();
      final combined = [...active, ...history];
      
      if (mounted) {
        setState(() {
          _allTasks = combined;
          _selectedTask = widget.initialTask ?? (combined.isNotEmpty ? combined.first : null);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<Uint8List> _generatePdfDocument(PdfPageFormat format) async {
    final pdf = pw.Document();
    final task = _selectedTask;

    pdf.addPage(
      pw.Page(
        pageFormat: format,
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text('REPUBLIC OF THE PHILIPPINES', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 2),
                pw.Text('MUNICIPALITY OF MATAASNAKAHOY', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
                pw.Text('Business Permit & Licensing Office (BPLO)', style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey700)),
                pw.SizedBox(height: 8),
                pw.Divider(thickness: 1.5, color: PdfColors.green900),
                pw.SizedBox(height: 16),
                pw.Text(
                  _noticeType.toUpperCase(),
                  style: pw.TextStyle(
                    fontSize: 18,
                    fontWeight: pw.FontWeight.bold,
                    color: _noticeType == 'Notice of Violation' ? PdfColors.red : PdfColors.green900,
                  ),
                ),
                pw.SizedBox(height: 24),
                pw.Row(children: [
                  pw.SizedBox(width: 140, child: pw.Text('Establishment Name:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(child: pw.Text(task?.detectedName ?? 'N/A')),
                ]),
                pw.SizedBox(height: 10),
                pw.Row(children: [
                  pw.SizedBox(width: 140, child: pw.Text('Barangay Location:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(child: pw.Text(task?.barangayName ?? 'N/A')),
                ]),
                pw.SizedBox(height: 10),
                pw.Row(children: [
                  pw.SizedBox(width: 140, child: pw.Text('Inspection Date:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(child: pw.Text(task?.irTimestamp ?? DateTime.now().toString().split(' ')[0])),
                ]),
                pw.SizedBox(height: 10),
                pw.Row(children: [
                  pw.SizedBox(width: 140, child: pw.Text('Current Status:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(child: pw.Text(task?.verificationStatus ?? 'Assigned')),
                ]),
                pw.SizedBox(height: 10),
                pw.Row(children: [
                  pw.SizedBox(width: 140, child: pw.Text('Flag Classification:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(child: pw.Text(task?.flagColor ?? 'Green')),
                ]),
                pw.SizedBox(height: 24),
                pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.grey200,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Text(
                    _noticeType == 'Notice of Violation'
                        ? 'NOTICE: This establishment has been flagged for compliance verification. Please present valid business permits to the BPLO main office within 5 business days.'
                        : 'CERTIFICATION: Field inspection completed in compliance with local municipal tax ordinance and business licensing standards.',
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(fontSize: 11),
                  ),
                ),
                pw.Spacer(),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('OFFICIAL MUNICIPAL SEAL', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey)),
                        pw.SizedBox(height: 2),
                        pw.Text('BPLO Field Inspection Division', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                    pw.BarcodeWidget(
                      data: 'REVELA-BPLO-${task?.reportID ?? 0}',
                      barcode: pw.Barcode.qrCode(),
                      width: 55,
                      height: 55,
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    return pdf.save();
  }

  void _handlePrint() async {
    if (_selectedTask == null) return;
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => _generatePdfDocument(format),
      name: 'BPLO_Notice_${_selectedTask!.reportID}.pdf',
    );
  }

  void _handleExportPdf() async {
    if (_selectedTask == null) return;
    try {
      final bytes = await _generatePdfDocument(PdfPageFormat.a4);
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'BPLO_Notice_${_selectedTask!.reportID}.pdf',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error exporting PDF: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notice & PDF Generator', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _allTasks.isEmpty
              ? const Center(child: Text('No inspection records available to generate notice.'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Selection Controls Card ──
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 2,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Document Options',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textDark),
                              ),
                              const SizedBox(height: 12),
                              DropdownButtonFormField<InspectionTask>(
                                value: _selectedTask,
                                decoration: const InputDecoration(
                                  labelText: 'Select Establishment',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.storefront),
                                ),
                                items: _allTasks.map((t) {
                                  return DropdownMenuItem(
                                    value: t,
                                    child: Text(
                                      '${t.detectedName} (${t.barangayName})',
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) => setState(() => _selectedTask = val),
                              ),
                              const SizedBox(height: 12),
                              DropdownButtonFormField<String>(
                                value: _noticeType,
                                decoration: const InputDecoration(
                                  labelText: 'Notice Template',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.description_outlined),
                                ),
                                items: const [
                                  DropdownMenuItem(value: 'Inspection Certificate', child: Text('Official BPLO Inspection Notice')),
                                  DropdownMenuItem(value: 'Notice of Violation', child: Text('Notice of Violation / Non-Compliance')),
                                ],
                                onChanged: (val) => setState(() => _noticeType = val ?? 'Inspection Certificate'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // ── Document Preview Paper ──
                      const Text(
                        'Live Document Preview',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textDark),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderColor, width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            // Header Seals & Title
                            const Icon(Icons.account_balance_rounded, size: 40, color: AppColors.darkGreen),
                            const SizedBox(height: 6),
                            const Text(
                              'REPUBLIC OF THE PHILIPPINES',
                              style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold),
                            ),
                            const Text(
                              'MUNICIPALITY OF MATAASNAKAHOY',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.darkGreen),
                            ),
                            const Text(
                              'Business Permit & Licensing Office (BPLO)',
                              style: TextStyle(fontSize: 11, color: AppColors.textMid),
                            ),
                            const Divider(height: 24, thickness: 1.5),
                            
                            Text(
                              _noticeType.toUpperCase(),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: _noticeType == 'Notice of Violation' ? Colors.red : AppColors.darkGreen,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: 16),
                            
                            _buildDocRow('Establishment Name:', _selectedTask?.detectedName ?? 'N/A'),
                            _buildDocRow('Barangay Location:', _selectedTask?.barangayName ?? 'N/A'),
                            _buildDocRow('Inspection Date:', _selectedTask?.irTimestamp ?? DateTime.now().toString().split(' ')[0]),
                            _buildDocRow('Current Status:', _selectedTask?.verificationStatus ?? 'Assigned'),
                            _buildDocRow('Flag Classification:', _selectedTask?.flagColor ?? 'Green'),
                            const SizedBox(height: 16),
                            
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _noticeType == 'Notice of Violation'
                                    ? 'NOTICE: This establishment has been flagged for compliance verification. Please present valid business permits to the BPLO main office within 5 business days.'
                                    : 'CERTIFICATION: Field inspection completed in compliance with local municipal tax ordinance and business licensing standards.',
                                style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textMid),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(height: 20),

                            // Footer & Simulated QR
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('OFFICIAL SEAL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    SizedBox(height: 2),
                                    Text('BPLO Verification', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey.shade400),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Icon(Icons.qr_code_2, size: 44, color: AppColors.darkGreen),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // ── Bottom Actions ──
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.darkGreen,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              icon: const Icon(Icons.print_rounded),
                              label: const Text('Print Notice'),
                              onPressed: _handlePrint,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.darkGreen,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                side: const BorderSide(color: AppColors.darkGreen, width: 1.5),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              icon: const Icon(Icons.picture_as_pdf),
                              label: const Text('Export PDF Notice'),
                              onPressed: _handleExportPdf,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
    );
  }

  Widget _buildDocRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMid)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          ),
        ],
      ),
    );
  }
}
