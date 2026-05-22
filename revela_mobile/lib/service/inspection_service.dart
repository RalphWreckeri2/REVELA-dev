import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_config.dart';
import 'auth_service.dart';

class InspectionTask {
  final int reportID;
  final int logID;
  final String detectedName;
  final String barangayName;
  final String flagColor;
  final String verificationStatus;
  final String? remarks;
  final String? photoPath;
  final String? nearestLandmark;
  final double? latitude;
  final double? longitude;
  final String irTimestamp;
  /// Field result after inspector submits (null while still open).
  final String? inspectionResult;

  InspectionTask({
    required this.reportID,
    required this.logID,
    required this.detectedName,
    required this.barangayName,
    required this.flagColor,
    required this.verificationStatus,
    this.remarks,
    this.photoPath,
    this.nearestLandmark,
    this.latitude,
    this.longitude,
    required this.irTimestamp,
    this.inspectionResult,
  });

  factory InspectionTask.fromJson(Map<String, dynamic> json) {
    return InspectionTask(
      reportID: _asInt(json['reportID']),
      logID: _asInt(json['logID']),
      detectedName: json['detectedName']?.toString() ?? 'Unknown',
      barangayName: json['barangayName']?.toString() ?? 'Unknown Barangay',
      flagColor: json['flagColor']?.toString() ?? 'Green',
      verificationStatus:
          json['verificationStatus']?.toString() ?? 'Assigned',
      remarks: json['remarks']?.toString(),
      photoPath: json['photoPath']?.toString(),
      nearestLandmark: json['nearestLandmark']?.toString(),
      latitude: json['latitude'] != null
          ? double.tryParse(json['latitude'].toString())
          : null,
      longitude: json['longitude'] != null
          ? double.tryParse(json['longitude'].toString())
          : null,
      irTimestamp: json['irTimestamp']?.toString() ?? '',
      inspectionResult: json['inspectionResult']?.toString(),
    );
  }

  static int _asInt(dynamic v) {
    if (v is int) return v;
    return int.tryParse(v?.toString() ?? '') ?? 0;
  }
}

class InspectionService {
  static final InspectionService _instance = InspectionService._internal();
  factory InspectionService() => _instance;
  InspectionService._internal();

  final AuthService _auth = AuthService();

  /// Active assignments from the server (Assigned + Reassigned).
  Future<List<InspectionTask>> getMyTasks() async {
    try {
      final response = await _auth.dio.get('/api/inspections/tasks');
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((e) => InspectionTask.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      debugPrint('InspectionService.getMyTasks: ${e.response?.data ?? e.message}');
      rethrow;
    }
  }

  /// Full history for the logged-in inspector (all statuses).
  Future<List<InspectionTask>> getMyReportHistory() async {
    try {
      final response = await _auth.dio.get('/api/inspections/my-reports');
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((e) => InspectionTask.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      debugPrint(
          'InspectionService.getMyReportHistory: ${e.response?.data ?? e.message}');
      rethrow;
    }
  }

  /// Returns a relative `photoURL` for [submitInspection], or null on failure.
  Future<String?> uploadEvidence(String localPath) async {
    final file = File(localPath);
    if (!await file.exists()) return null;

    final name = localPath.split(Platform.pathSeparator).last;
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(localPath, filename: name),
    });

    final response = await _auth.dio.post(
      '/api/inspections/evidence',
      data: form,
    );
    return response.data['photoURL'] as String?;
  }

  /// POST /api/inspections/submit — dashboard shows **Submitted** until admin verifies.
  Future<void> submitInspection({
    required InspectionTask task,
    required String inspectionResult,
    String? notes,
    double? verifiedLat,
    double? verifiedLng,
    String? evidenceLocalPath,
    String? photoURL,
  }) async {
    String? resolvedPhotoUrl = photoURL;
    if (resolvedPhotoUrl == null &&
        evidenceLocalPath != null &&
        evidenceLocalPath.isNotEmpty) {
      resolvedPhotoUrl = await uploadEvidence(evidenceLocalPath);
    }

    await _auth.dio.post('/api/inspections/submit', data: {
      'logID': task.logID,
      'inspectionResult': inspectionResult,
      'verifiedLat': verifiedLat,
      'verifiedLng': verifiedLng,
      'notes': notes,
      'photoURL': resolvedPhotoUrl,
    });
  }

  /// Build absolute URL for evidence thumbnails (relative paths from API).
  static String? mediaAbsoluteUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    final base = ApiConfig.apiBase.replaceAll(RegExp(r'/$'), '');
    if (path.startsWith('/')) return '$base$path';
    return '$base/$path';
  }
}
