from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_mysqldb import MySQL
from config import Config
from flask_cors import CORS
from werkzeug.exceptions import HTTPException


mysql = MySQL()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Init extensions
    mysql.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from api.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from api.registry.routes import registry_bp
    app.register_blueprint(registry_bp, url_prefix="/api/registry")

    from api.flags.routes import flags_bp
    app.register_blueprint(flags_bp, url_prefix="/api/flags")

    from api.users.routes import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/users")

    from api.inspections.routes import inspections_bp
    app.register_blueprint(inspections_bp, url_prefix="/api/inspections")

    # Apply a robust CORS configuration covering all API routes
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        }
    })

    # Intercept all exceptions to ensure CORS headers are preserved on 500 errors
    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
