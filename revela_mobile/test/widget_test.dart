import 'package:flutter_test/flutter_test.dart';
import 'package:revela_mobile/main.dart';

void main() {
  testWidgets('App launches without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(seenWelcome: false, isLoggedIn: false));
    expect(find.text('REVELA'), findsWidgets);
  });

  testWidgets('App goes to login when welcome already seen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp(seenWelcome: true, isLoggedIn: false));
    expect(find.text('Sign in to continue'), findsOneWidget);
  });
}
