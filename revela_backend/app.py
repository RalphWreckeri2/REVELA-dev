from flask import Flask
from flask_jwt_extended import JWTManager
from flask_mysqldb import MySQL
from config import Config
from flask_cors import CORS


mysql = MySQL()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])
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

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
