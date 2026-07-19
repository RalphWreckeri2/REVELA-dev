import os
from flask import Flask
from flask_mysqldb import MySQL

app = Flask(__name__)
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'revela_user'
app.config['MYSQL_PASSWORD'] = 'dalkoman1-9'
app.config['MYSQL_DB'] = 'revela_db'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

with app.app_context():
    cursor = mysql.connection.cursor()
    cursor.execute("SHOW INDEXES FROM inspection_reports;")
    indexes = cursor.fetchall()
    print("Indexes on inspection_reports:", indexes)

    print("\nEXPLAIN GET TASKS:")
    cursor.execute("""
        EXPLAIN SELECT
            ir.reportID, ir.userID, ir.targetID AS logID, ir.inspectionResult,
            ir.verificationStatus, ir.remarks, ir.photoPath, ir.irTimestamp, ir.deadline, ir.nearestLandmark,
            g.detectedName, g.flagColor, g.latitude, g.longitude,
            b.barangayName
        FROM inspection_reports ir
        JOIN geospatial_logs g  ON ir.targetID   = g.logID
        LEFT JOIN barangays b   ON g.barangayID  = b.barangayID
        WHERE ir.userID = 1
          AND ir.verificationStatus IN ('Assigned', 'Reassigned')
        ORDER BY ir.irTimestamp DESC
    """)
    for row in cursor.fetchall():
        print(row)
    cursor.close()
