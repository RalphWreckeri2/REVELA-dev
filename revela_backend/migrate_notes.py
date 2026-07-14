import MySQLdb

conn = MySQLdb.connect(
    host='localhost', port=3306,
    user='revela_user', passwd='dalkoman1-9', db='revela_db'
)
c = conn.cursor()
c.execute(
    "SELECT COUNT(*) FROM information_schema.COLUMNS "
    "WHERE TABLE_SCHEMA = 'revela_db' "
    "AND TABLE_NAME = 'geospatial_logs' "
    "AND COLUMN_NAME = 'notes'"
)
exists = c.fetchone()[0]
if not exists:
    c.execute(
        "ALTER TABLE geospatial_logs "
        "ADD COLUMN notes TEXT DEFAULT NULL"
    )
    conn.commit()
    print("Migration OK -- notes column added")
else:
    print("Column already exists -- no migration needed")
c.close()
conn.close()
