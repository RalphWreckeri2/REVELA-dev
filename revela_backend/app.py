from flask import Flask, app
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

    from api.users.routes import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/users")

    from api.inspections.routes import inspections_bp
    app.register_blueprint(inspections_bp, url_prefix="/api/inspections")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
