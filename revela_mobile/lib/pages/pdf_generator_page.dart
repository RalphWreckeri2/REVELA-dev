import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../service/inspection_service.dart';
import 'package:flutter/services.dart' show rootBundle;
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
  String _noticeType =
      'Inspection Certificate'; // 'Inspection Certificate' or 'Notice of Violation'
  bool _isLoading = true;

  bool get _isNonCompliant {
    final flag = (_selectedTask?.flagColor ?? 'Green').toLowerCase();
    return flag == 'red' || flag.contains('non') || flag.contains('violation');
  }

  String get _documentTitle {
    return _isNonCompliant
        ? 'NOTICE OF NON-COMPLIANCE'
        : 'INSPECTION CERTIFICATE';
  }

  String get _certificationText {
    if (_isNonCompliant) {
      return "CERTIFICATION: According to the records of this office, your establishment has not yet secured the required BUSINESS AND MAYOR'S PERMIT. Consequently, you are hereby requested to coordinate with our office within five (5) days upon receipt of this notice. Thank you very much.";
    }

    return 'CERTIFICATION: This is to certify that, based on the records of this office, the establishment has undergone inspection and is hereby acknowledged for compliance with applicable licensing requirements.';
  }

  String get _ownerPrefix {
    return 'G./Gng./Bb.';
  }

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
          _selectedTask =
              widget.initialTask ??
              (combined.isNotEmpty ? combined.first : null);
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

    final mtkSealBytes = await rootBundle.load('assets/images/seal.png');
    final bpSealBytes = await rootBundle.load(
      'assets/images/bagongpilipinas.png',
    );
    final mtkSeal = pw.MemoryImage(mtkSealBytes.buffer.asUint8List());
    final bpSeal = pw.MemoryImage(bpSealBytes.buffer.asUint8List());

    final barangayName = task?.barangayName ?? '';

    pdf.addPage(
      pw.MultiPage(
        pageFormat: format,
        margin: const pw.EdgeInsets.fromLTRB(18, 18, 18, 72),
        footer: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              pw.Text(
                'Health | Opportunity | Peace & Order | Education & Economy',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.blue900,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                'L O V E M A T A A S N A K A H O Y',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.orange900,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          );
        },
        build: (pw.Context context) => [
          pw.Container(
            padding: const pw.EdgeInsets.all(18),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Container(
                      width: 46,
                      height: 46,
                      child: pw.Image(mtkSeal, fit: pw.BoxFit.contain),
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Text(
                          'REPUBLIKA NG PILIPINAS',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'LALAWIGAN NG BATANGAS',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'BAYAN NG MATAASNAKAHOY',
                          style: pw.TextStyle(
                            fontSize: 12,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.green900,
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'BUSINESS PERMIT & LICENSING OFFICE (BPLO)',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                            color: PdfColors.grey700,
                          ),
                        ),
                      ],
                    ),
                    pw.Container(
                      width: 46,
                      height: 46,
                      child: pw.Image(bpSeal, fit: pw.BoxFit.contain),
                    ),
                  ],
                ),
                pw.SizedBox(height: 16),
                pw.Text(
                  _documentTitle,
                  style: pw.TextStyle(
                    fontSize: 15,
                    fontWeight: pw.FontWeight.bold,
                    color: _isNonCompliant ? PdfColors.red : PdfColors.green900,
                  ),
                  textAlign: pw.TextAlign.center,
                ),
                pw.SizedBox(height: 14),
                pw.Text(
                  'To the Owner/Representative:',
                  style: pw.TextStyle(
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 6),
                pw.Text(_ownerPrefix, style: pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 2),
                pw.Text(
                  task?.detectedName ?? 'N/A',
                  style: pw.TextStyle(
                    fontSize: 10,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 2),
                pw.Text(
                  barangayName.isNotEmpty
                      ? 'Barangay $barangayName, Mataasnakahoy, Batangas'
                      : 'Barangay IV, Mataasnakahoy, Batangas',
                  style: pw.TextStyle(fontSize: 10),
                ),
                pw.SizedBox(height: 12),
                pw.Container(
                  padding: const pw.EdgeInsets.all(8),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.grey200,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Text(
                    _certificationText,
                    textAlign: pw.TextAlign.justify,
                    style: pw.TextStyle(fontSize: 9.5),
                  ),
                ),
                pw.SizedBox(height: 16),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Container(
                      width: 100,
                      height: 1,
                      color: PdfColors.grey700,
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'BPLO Head',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error exporting PDF: $e')));
      }
    }
  }

  Widget _buildStickyFooter() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFF4F6F4),
        border: Border(top: BorderSide(color: Color(0xFFD0DDD0), width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE6EAE8)),
                  boxShadow: [
                    const BoxShadow(
                      color: Color(0x08000000),
                      blurRadius: 14,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18.0,
                        vertical: 16.0,
                      ),
                      child: Text(
                        'Notice: Generate and download operational compliance reports in PDF formats.',
                        style: TextStyle(
                          color: const Color(0xFF55616A),
                          fontSize: 13,
                          height: 1.45,
                        ),
                      ),
                    ),
                    const Divider(
                      height: 1,
                      thickness: 1,
                      color: Color(0xFFE6EAE8),
                    ),
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16.0,
                        vertical: 10.0,
                      ),
                      title: const Text(
                        'BPLO Field Inspection Action',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Color(0xFF1F2933),
                        ),
                      ),
                      subtitle: const Text(
                        'Overview of the field inspection verification and validation status.',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 12,
                        ),
                      ),
                      trailing: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4CAF50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 12,
                          ),
                          elevation: 0,
                        ),
                        onPressed: _handleExportPdf,
                        child: const Text(
                          'Download',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedBarangay = _selectedTask?.barangayName ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Notice & PDF Generator',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _allTasks.isEmpty
          ? const Center(
              child: Text(
                'No inspection records available to generate notice.',
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 240),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Selection Controls Card ──
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Document Options',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<InspectionTask>(
                            isExpanded: true,
                            initialValue: _selectedTask,
                            decoration: const InputDecoration(
                              labelText: 'Select Establishment',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.storefront),
                            ),
                            items: _allTasks.map((t) {
                              return DropdownMenuItem(
                                value: t,
                                child: Flexible(
                                  child: Text(
                                    '${t.detectedName} (${t.barangayName})',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) =>
                                setState(() => _selectedTask = val),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            isExpanded: true,
                            initialValue: _noticeType,
                            decoration: const InputDecoration(
                              labelText: 'Notice Template',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.description_outlined),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'Inspection Certificate',
                                child: Text(
                                  'Official BPLO Inspection Notice',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'Notice of Violation',
                                child: Text(
                                  'Notice of Violation / Non-Compliance',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                            onChanged: (val) => setState(
                              () =>
                                  _noticeType = val ?? 'Inspection Certificate',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Document Preview Paper ──
                  const Text(
                    'Live Document Preview',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.borderColor,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        // Header Seals & Title
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/images/seal.png',
                              width: 42,
                              height: 42,
                            ),
                            Expanded(
                              child: Column(
                                children: const [
                                  Text(
                                    'REPUBLIC OF THE PHILIPPINES',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      letterSpacing: 1.1,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'PROVINCE OF BATANGAS',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'MUNICIPALITY OF MATAASNAKAHOY',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.darkGreen,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'BUSINESS PERMIT & LICENSING OFFICE (BPLO)',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textMid,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Image.asset(
                              'assets/images/bagongpilipinas.png',
                              width: 42,
                              height: 42,
                            ),
                          ],
                        ),
                        const Divider(height: 20, thickness: 1.2),

                        Text(
                          _documentTitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: _isNonCompliant
                                ? Colors.red
                                : AppColors.darkGreen,
                            letterSpacing: 1.05,
                          ),
                        ),
                        const SizedBox(height: 12),

                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'To the Owner/Representative:',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _ownerPrefix,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: AppColors.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _selectedTask?.detectedName ?? 'N/A',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                selectedBarangay.isNotEmpty
                                    ? 'Barangay $selectedBarangay, Mataasnakahoy, Batangas'
                                    : 'Barangay IV, Mataasnakahoy, Batangas',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: AppColors.textMid,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),

                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _certificationText,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.textMid,
                              height: 1.35,
                            ),
                            textAlign: TextAlign.justify,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Sign-off
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 100,
                              child: Container(
                                height: 1,
                                color: Colors.grey.shade700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'BPLO Head',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),

                        // Document branding footer
                        const SizedBox(height: 14),
                        Container(
                          height: 1,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Health | Opportunity | Peace & Order | Education & Economy',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0D47A1), // blue900
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'L O V E  M A T A A S N A K A H O Y',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFE65100), // orange900
                            letterSpacing: 1.5,
                          ),
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
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
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
                            side: const BorderSide(
                              color: AppColors.darkGreen,
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
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
      bottomSheet: _buildStickyFooter(),
    );
  }
}
