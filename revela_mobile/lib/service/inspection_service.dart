import 'package:dio/dio.dart';
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
  });

  factory InspectionTask.fromJson(Map<String, dynamic> json) {
    return InspectionTask(
      reportID: json['reportID'],
      logID: json['logID'],
      detectedName: json['detectedName'] ?? 'Unknown',
      barangayName: json['barangayName'] ?? 'Unknown Barangay',
      flagColor: json['flagColor'] ?? 'Green',
      verificationStatus: json['verificationStatus'] ?? 'Assigned',
      remarks: json['remarks'],
      photoPath: json['photoPath'],
      nearestLandmark: json['nearestLandmark'],
      latitude: json['latitude'] != null
          ? double.tryParse(json['latitude'].toString())
          : null,
      longitude: json['longitude'] != null
          ? double.tryParse(json['longitude'].toString())
          : null,
      irTimestamp: json['irTimestamp'] ?? '',
    );
  }
}

class InspectionService {
  static final InspectionService _instance = InspectionService._internal();
  factory InspectionService() => _instance;
  InspectionService._internal();

  final AuthService _auth = AuthService();

  Future<List<InspectionTask>> getMyTasks() async {
    try {
      final response = await _auth.dio.get('/api/inspections/tasks');
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((e) => InspectionTask.fromJson(e)).toList();
    } on DioException catch (e) {
      print('InspectionService error: ${e.response?.data ?? e.message}');
      return [];
    }
  }
}
