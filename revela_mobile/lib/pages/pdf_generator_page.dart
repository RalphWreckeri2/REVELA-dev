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
  bool _isLoading = true;

  String get _documentTitle {
    final lvl = _selectedTask?.currentNoticeLevel ?? 0;
    if (lvl == 1) return '2ND NOTICE: WARNING FOR CLOSURE';
    if (lvl >= 2) return '3RD NOTICE: CLOSURE ORDER';
    return '1ST NOTICE: WARNING FOR NON-COMPLIANCE';
  }

  String get _certificationText {
    final lvl = _selectedTask?.currentNoticeLevel ?? 0;
    if (lvl == 1) {
      return "CERTIFICATION: According to the records of this office, your establishment has continuously failed to secure the required BUSINESS AND MAYOR'S PERMIT despite our first warning. You are hereby given a FINAL WARNING. Failure to comply within three (3) days will result in the immediate closure of your business.";
    } else if (lvl >= 2) {
      return "CERTIFICATION: Be informed that your establishment is hereby ORDERED CLOSED due to your habitual failure to secure the required BUSINESS AND MAYOR'S PERMIT despite multiple warnings. You must cease all business operations immediately until full compliance is met.";
    } else {
      return "CERTIFICATION: According to the records of this office, your establishment has not yet secured the required BUSINESS AND MAYOR'S PERMIT. Consequently, you are hereby requested to coordinate with our office within five (5) days upon receipt of this notice. Thank you very much.";
    }
  }

  String get _ownerPrefix {
    return 'G./Gng./Bb.';
  }

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  void _showSearchModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _SearchModal(
          tasks: _allTasks,
          onSelected: (task) {
            setState(() => _selectedTask = task);
          },
        );
      },
    );
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final active = await _inspectionService.getMyTasks();
      final history = await _inspectionService.getMyReportHistory();
      final combined = [...active, ...history];
      
      final uniqueTasks = <int, InspectionTask>{};
      for (final t in combined) {
        uniqueTasks[t.reportID] = t;
      }
      final deduped = uniqueTasks.values.toList();

      if (mounted) {
        setState(() {
          _allTasks = deduped;
          _selectedTask =
              widget.initialTask ??
              (deduped.isNotEmpty ? deduped.first : null);
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
                    color: PdfColors.red,
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

  @override
  Widget build(BuildContext context) {
    final selectedBarangay = _selectedTask?.barangayName ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Notice & PDF Generator',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _allTasks.isEmpty
          ? Center(
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
                          Text(
                            'Document Options',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: context.adaptiveTextDark,
                            ),
                          ),
                          SizedBox(height: 12),
                          InkWell(
                            onTap: () => _showSearchModal(context),
                            borderRadius: BorderRadius.circular(4),
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Select Establishment',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.search),
                                suffixIcon: Icon(Icons.arrow_drop_down),
                              ),
                              child: Text(
                                _selectedTask != null
                                    ? '${_selectedTask!.detectedName} (${_selectedTask!.barangayName})'
                                    : 'Tap to search...',
                                style: TextStyle(
                                  color: _selectedTask != null ? context.adaptiveTextDark : context.adaptiveTextMid,
                                  fontSize: 16,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  SizedBox(height: 20),

                  // ── Document Preview Paper ──
                  Text(
                    'Live Document Preview',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: context.adaptiveTextDark,
                    ),
                  ),
                  SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: context.adaptiveSurface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: context.adaptiveBorder,
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
                                children: [
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
                                      color: context.adaptivePrimary,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'BUSINESS PERMIT & LICENSING OFFICE (BPLO)',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w500,
                                      color: context.adaptiveTextMid,
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
                        Divider(height: 20, thickness: 1.2),

                        Text(
                          _documentTitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                            letterSpacing: 1.05,
                          ),
                        ),
                        SizedBox(height: 12),

                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'To the Owner/Representative:',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: context.adaptiveTextDark,
                                ),
                              ),
                              SizedBox(height: 6),
                              Text(
                                _ownerPrefix,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  color: context.adaptiveTextDark,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                _selectedTask?.detectedName ?? 'N/A',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  color: context.adaptiveTextDark,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                selectedBarangay.isNotEmpty
                                    ? 'Barangay $selectedBarangay, Mataasnakahoy, Batangas'
                                    : 'Barangay IV, Mataasnakahoy, Batangas',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  color: context.adaptiveTextMid,
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(height: 8),

                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: context.adaptiveBackground,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _certificationText,
                            style: TextStyle(
                              fontSize: 10,
                              color: context.adaptiveTextMid,
                              height: 1.35,
                            ),
                            textAlign: TextAlign.justify,
                          ),
                        ),
                        SizedBox(height: 12),

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
                            SizedBox(height: 4),
                            Text(
                              'BPLO Head',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),

                        // Document branding footer
                        SizedBox(height: 14),
                        Container(
                          height: 1,
                          color: Colors.grey.shade300,
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Health | Opportunity | Peace & Order | Education & Economy',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0D47A1), // blue900
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
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
                  SizedBox(height: 24),

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
                          icon: Icon(Icons.print_rounded),
                          label: Text('Print Notice'),
                          onPressed: _handlePrint,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: context.adaptivePrimary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: BorderSide(
                              color: context.adaptivePrimary,
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: Icon(Icons.picture_as_pdf),
                          label: Text('Export PDF Notice'),
                          onPressed: _handleExportPdf,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}

class _SearchModal extends StatefulWidget {
  final List<InspectionTask> tasks;
  final ValueChanged<InspectionTask> onSelected;

  const _SearchModal({required this.tasks, required this.onSelected});

  @override
  State<_SearchModal> createState() => _SearchModalState();
}

class _SearchModalState extends State<_SearchModal> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.tasks.where((t) {
      final q = _query.toLowerCase();
      return t.detectedName.toLowerCase().contains(q) ||
             t.barangayName.toLowerCase().contains(q);
    }).toList();

    return Container(
      decoration: BoxDecoration(
        color: context.adaptiveSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      margin: const EdgeInsets.only(top: 60),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Search Establishment or Barangay...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: (val) => setState(() => _query = val),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final t = filtered[index];
                return ListTile(
                  leading: const Icon(Icons.storefront),
                  title: Text(t.detectedName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(t.barangayName),
                  onTap: () {
                    widget.onSelected(t);
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
