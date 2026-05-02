from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pymysql

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

def get_db():
    return pymysql.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT')),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        cursorclass=pymysql.cursors.DictCursor
    )


@app.route('/ping')
def ping():
    try:
        conn = get_db()
        conn.close()
        return {'status': 'ok', 'db': 'connected'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500


if __name__ == '__main__':
    app.run(debug=True)
