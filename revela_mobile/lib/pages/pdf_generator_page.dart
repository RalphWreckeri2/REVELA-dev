import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:google_fonts/google_fonts.dart';
import '../service/inspection_service.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_app_bar.dart';

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
  bool _showEditForm = false;
  String? _signatureBase64;

  final TextEditingController _ownerNameController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _natureOfBusinessController = TextEditingController();
  final TextEditingController _signatoryNameController = TextEditingController(text: 'MIAN S. CASTIILO');
  final TextEditingController _signatoryPositionController = TextEditingController(text: 'Licensing Officer II');

  @override
  void dispose() {
    _ownerNameController.dispose();
    _addressController.dispose();
    _natureOfBusinessController.dispose();
    _signatoryNameController.dispose();
    _signatoryPositionController.dispose();
    super.dispose();
  }

  String get _formattedDate {
    final now = DateTime.now();
    const months = [
      'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
      'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'
    ];
    return '${months[now.month - 1]} ${now.day}, ${now.year}';
  }

  String get _certificationText {
    final lvl = _selectedTask?.currentNoticeLevel ?? 0;
    final biz = _natureOfBusinessController.text.trim();
    final bizText = biz.isEmpty ? "(NATURE OF BUSINESS)" : biz;

    if (lvl == 1) {
      return "Muli po naming ipinababatid sa inyo na ayon po sa aming talaan ng aming tanggapan, na ang inyo pong $bizText matagal ng hindi nakukuha ng kaukulang permiso (BUSINESS AND MAYOR'S PERMIT).\n\nSa kadahilanang pong ito, kayo ay malugod naming inaanyayahang makipag-ugnayan sa aming tanggapan sa loob ng limang (5) araw pagkatanggap ninyo ng liham na ito.";
    } else if (lvl >= 2) {
      return "Magandang Araw po!\n\nNais po naming tawagin ang inyong pansin sa hindi ninyo pagtalima at pagpansin sa kabila ng aming abiso hinggil sa hindi ninyo pagtubos ng karampatang Permiso o Lisensya para sa inyong negosyo. Ito po ay labag sa ating ORDINANSA BLG. 27-S-96.\n\nHinggil po dito, kayo po ay aming inaanyayahang magsadya sa aming tanggapan sa loob ng tatlong (3) araw pagkatanggap ninyo ng liham na ito.\n\nAng hindi po ninyo pagpansin sa aming abiso ay magiging basehan namin upang ipatigil ang patuloy ninyong illegal na pagpapatakbo ng negosyo.";
    } else {
      return "Ayon po sa talaan ng aming tanggapan, ang inyo pong $bizText hindi pa nakukuha ng kaukulang permiso (BUSINESS AND MAYOR'S PERMIT).\n\nSa kadahilanang pong ito, kayo ay malugod naming inaanyayahang makipag-ugnayan sa aming tanggapan sa loob ng tatlong (3) araw pagkatanggap ninyo ng liham na ito.";
    }
  }

  @override
  void initState() {
    super.initState();
    _loadTasks();
    _loadSignature();
  }

  Future<void> _loadSignature() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _signatureBase64 = prefs.getString('saved_signature_base64');
    });
  }

  Future<void> _pickSignature() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 800);
    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      final base64String = base64Encode(bytes);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_signature_base64', base64String);
      setState(() {
        _signatureBase64 = base64String;
      });
    }
  }

  Future<void> _removeSignature() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_signature_base64');
    setState(() {
      _signatureBase64 = null;
    });
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
            setState(() {
              _selectedTask = task;
              _addressController.text = 'Brgy. ${task.barangayName}, Mataasnakahoy Batangas';
            });
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
          if (_selectedTask != null) {
            _addressController.text = 'Brgy. ${_selectedTask!.barangayName}, Mataasnakahoy Batangas';
          }
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

    final mtkSealBytes = await rootBundle.load('assets/images/seal.png');
    final bpSealBytes = await rootBundle.load(
      'assets/images/bagongpilipinas.png',
    );
    final mtkSeal = pw.MemoryImage(mtkSealBytes.buffer.asUint8List());
    final bpSeal = pw.MemoryImage(bpSealBytes.buffer.asUint8List());
    final footerFont = await PdfGoogleFonts.montserratBold();

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
                  font: footerFont,
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
                          'Republika ng Pilipinas',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                          ),
                        ),
                        pw.SizedBox(height: 1),
                        pw.Text(
                          'Lalawigan ng Batangas',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                          ),
                        ),
                        pw.SizedBox(height: 1),
                        pw.Text(
                          'Bayan ng Mataasnakahoy',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                          ),
                        ),
                        pw.SizedBox(height: 1),
                        pw.Text(
                          'TANGGAPAN NG PUNUMBAYAN',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.SizedBox(height: 1),
                        pw.Text(
                          'Telepono #: 461-2374',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                          ),
                        ),
                        pw.SizedBox(height: 1),
                        pw.Text(
                          'Email: licensingoffice2374@yahoo.com',
                          style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: pw.FontWeight.normal,
                            color: PdfColors.blue,
                            decoration: pw.TextDecoration.underline,
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
                pw.SizedBox(height: 14),
                pw.Text(
                  'SEKSYON NG PANGKALAKALANG KAPAHINTULUTAN AT LISENSYA',
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 14),
                pw.Container(
                  alignment: pw.Alignment.centerRight,
                  child: pw.Text(
                    _formattedDate,
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.normal,
                    ),
                  ),
                ),
                pw.SizedBox(height: 16),
                pw.Align(
                  alignment: pw.Alignment.centerLeft,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'To the Owner/Representative:',
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        _ownerNameController.text.trim().isEmpty ? '______________________' : _ownerNameController.text.trim(),
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        _addressController.text.trim().isEmpty ? '______________________' : _addressController.text.trim(),
                        style: pw.TextStyle(fontSize: 10),
                      ),
                    ],
                  ),
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
                    style: pw.TextStyle(fontSize: 10),
                  ),
                ),
                pw.SizedBox(height: 12),
                pw.Text('Maraming salamat po.', style: pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 12),
                pw.Align(
                  alignment: pw.Alignment.centerRight,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Text('Lubos na gumagalang,', style: pw.TextStyle(fontSize: 10)),
                      pw.SizedBox(height: 24),
                      pw.Stack(
                        alignment: pw.Alignment.bottomCenter,
                        children: [
                          if (_signatureBase64 != null)
                            pw.Positioned(
                              bottom: 12,
                              child: pw.Container(
                                height: 60,
                                child: pw.Image(pw.MemoryImage(base64Decode(_signatureBase64!)), fit: pw.BoxFit.contain),
                              ),
                            ),
                          pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.center,
                            children: [
                              pw.Text(
                                _signatoryNameController.text.trim().isEmpty ? '______________________' : _signatoryNameController.text.trim(),
                                style: pw.TextStyle(
                                  fontSize: 10,
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                              pw.SizedBox(height: 2),
                              pw.Text(
                                _signatoryPositionController.text.trim().isEmpty ? '______________________' : _signatoryPositionController.text.trim(),
                                style: pw.TextStyle(
                                  fontSize: 10,
                                  fontWeight: pw.FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
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
    if (_selectedTask == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an establishment first.'), backgroundColor: Colors.redAccent));
      return;
    }
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => _generatePdfDocument(format),
      name: 'BPLO_Notice_${_selectedTask!.reportID}.pdf',
    );
  }

  void _handleExportPdf() async {
    if (_selectedTask == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an establishment first.'), backgroundColor: Colors.redAccent));
      return;
    }
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
    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Notice Generator',
        icon: Icons.picture_as_pdf_rounded,
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
                                labelText: 'Select Establishment *',
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
                          if (_selectedTask != null) ...[
                            SizedBox(height: 12),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: _selectedTask!.currentNoticeLevel == 0 ? Colors.blue.withOpacity(0.1) : 
                                       _selectedTask!.currentNoticeLevel == 1 ? Colors.orange.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: _selectedTask!.currentNoticeLevel == 0 ? Colors.blue : 
                                         _selectedTask!.currentNoticeLevel == 1 ? Colors.orange : Colors.red,
                                ),
                              ),
                              child: Text(
                                _selectedTask!.currentNoticeLevel == 0 ? 'Generating: FIRST NOTICE' :
                                _selectedTask!.currentNoticeLevel == 1 ? 'Generating: SECOND NOTICE' : 'Generating: FINAL NOTICE (CLOSURE ORDER)',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: _selectedTask!.currentNoticeLevel == 0 ? Colors.blue : 
                                         _selectedTask!.currentNoticeLevel == 1 ? Colors.orange : Colors.red,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  
                  // ── Edit Notice Details Card ──
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Edit Document Details',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: context.adaptiveTextDark,
                                ),
                              ),
                              IconButton(
                                icon: Icon(_showEditForm ? Icons.expand_less : Icons.edit),
                                onPressed: () {
                                  setState(() => _showEditForm = !_showEditForm);
                                },
                              ),
                            ],
                          ),
                          if (_showEditForm) ...[
                            SizedBox(height: 16),
                            TextField(
                              controller: _ownerNameController,
                              decoration: InputDecoration(labelText: 'Owner/Representative Name', hintText: 'Leave blank for line'),
                              onChanged: (_) => setState(() {}),
                            ),
                            SizedBox(height: 12),
                            TextField(
                              controller: _addressController,
                              decoration: InputDecoration(labelText: 'Address'),
                              onChanged: (_) => setState(() {}),
                            ),
                            SizedBox(height: 12),
                            TextField(
                              controller: _natureOfBusinessController,
                              decoration: InputDecoration(labelText: 'Nature of Business', hintText: 'Leave blank for (NATURE OF BUSINESS)'),
                              onChanged: (_) => setState(() {}),
                            ),
                            SizedBox(height: 12),
                            TextField(
                              controller: _signatoryNameController,
                              decoration: InputDecoration(labelText: 'Signatory Name'),
                              onChanged: (_) => setState(() {}),
                            ),
                            SizedBox(height: 12),
                            TextField(
                              controller: _signatoryPositionController,
                              decoration: InputDecoration(labelText: 'Signatory Position'),
                              onChanged: (_) => setState(() {}),
                            ),
                            SizedBox(height: 16),
                            Text('E-Signature', style: TextStyle(fontWeight: FontWeight.bold, color: context.adaptiveTextDark)),
                            SizedBox(height: 4),
                            Text('(Please upload an image with a transparent background or no background for best results, to prevent covering the name text)', style: TextStyle(fontSize: 12, color: context.adaptiveTextMid)),
                            SizedBox(height: 8),
                            _signatureBase64 != null
                                ? Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        height: 60,
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: context.adaptiveBorder),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Image.memory(base64Decode(_signatureBase64!)),
                                      ),
                                      TextButton.icon(
                                        onPressed: _removeSignature,
                                        icon: Icon(Icons.delete, color: Colors.red),
                                        label: Text('Remove Signature', style: TextStyle(color: Colors.red)),
                                      ),
                                    ],
                                  )
                                : ElevatedButton.icon(
                                    onPressed: _pickSignature,
                                    icon: Icon(Icons.upload),
                                    label: Text('Upload E-Signature'),
                                  ),
                          ],
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
                  AspectRatio(
                      aspectRatio: 8.5 / 11,
                      child: Container(
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
                                    'Republika ng Pilipinas',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                  Text(
                                    'Lalawigan ng Batangas',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                  Text(
                                    'Bayan ng Mataasnakahoy',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                  Text(
                                    'TANGGAPAN NG PUNUMBAYAN',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    'Telepono #: 461-2374',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                  Text(
                                    'Email: licensingoffice2374@yahoo.com',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                      color: Colors.blue,
                                      decoration: TextDecoration.underline,
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
                          'SEKSYON NG PANGKALAKALANG KAPAHINTULUTAN AT LISENSYA',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            _formattedDate,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                        ),
                        SizedBox(height: 12),

                        Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
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
                                  _ownerNameController.text.trim().isEmpty ? '______________________' : _ownerNameController.text.trim(),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.bold,
                                    color: context.adaptiveTextDark,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  _addressController.text.trim().isEmpty ? '______________________' : _addressController.text.trim(),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    color: context.adaptiveTextMid,
                                  ),
                                ),
                              ],
                            ),
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
                        
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Maraming salamat po.', style: TextStyle(fontSize: 10, color: context.adaptiveTextMid)),
                        ),
                        SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text('Lubos na gumagalang,', style: TextStyle(fontSize: 10, color: context.adaptiveTextMid)),
                              SizedBox(height: 24),
                              Stack(
                                alignment: Alignment.bottomCenter,
                                clipBehavior: Clip.none,
                                children: [
                                  if (_signatureBase64 != null)
                                    Positioned(
                                      bottom: 12,
                                      child: Container(
                                        height: 60,
                                        child: Image.memory(base64Decode(_signatureBase64!), fit: BoxFit.contain),
                                      ),
                                    ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      Text(
                                        _signatoryNameController.text.trim().isEmpty ? '______________________' : _signatoryNameController.text.trim(),
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        _signatoryPositionController.text.trim().isEmpty ? '______________________' : _signatoryPositionController.text.trim(),
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.normal,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Document branding footer
                        const Spacer(),
                        Container(
                          height: 1,
                          color: Colors.grey.shade300,
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Health | Opportunity | Peace & Order | Education & Economy',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade900,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'L O V E M A T A A S N A K A H O Y',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.montserrat(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange.shade900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
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
