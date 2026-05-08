from app import mysql


def find_user_by_email(email):
    """Fetch a single user row by email."""
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM USERS WHERE email = %s", (email,))
    user = cur.fetchone()  # returns dict because of DictCursor
    cur.close()
    return user


def find_user_by_id(user_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM USERS WHERE userID = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    return user


def find_user_by_phone(phone):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM USERS WHERE phone = %s", (phone,))
    user = cur.fetchone()
    cur.close()
    return user


def update_password(user_id, hashed_password):
    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE USERS SET userPassword = %s, updatedAt = NOW()
        WHERE userID = %s
    """, (hashed_password, user_id))
    mysql.connection.commit()
    cur.close()


def update_last_login(user_id):
    """Stamp lastLoginAt on successful login."""
    cur = mysql.connection.cursor()
    cur.execute(
        "UPDATE USERS SET lastLoginAt = NOW() WHERE userID = %s",
        (user_id,)
    )
    mysql.connection.commit()
    cur.close()


def get_all_users():
    """Fetch all users except passwords."""
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT userID, fullName, email, phone, userRole, 
               createdAt, lastLoginAt, mustChangePassword
        FROM USERS
        ORDER BY createdAt DESC
    """)
    users = cur.fetchall()
    cur.close()
    # Serialise datetimes
    for u in users:
        for field in ("createdAt", "lastLoginAt"):
            if u.get(field):
                u[field] = str(u[field])
    return users


def create_user(full_name, email, hashed_password, role, phone=None):
    """Insert a new user with mustChangePassword=TRUE."""
    cur = mysql.connection.cursor()
    cur.execute("""
        INSERT INTO USERS 
            (fullName, email, userPassword, userRole, phone, mustChangePassword)
        VALUES (%s, %s, %s, %s, %s, TRUE)
    """, (full_name, email, hashed_password, role, phone))
    mysql.connection.commit()
    user_id = cur.lastrowid
    cur.close()
    return user_id


def update_user(user_id, full_name, email, role, phone=None):
    """Update user profile fields."""
    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE USERS
        SET fullName = %s, email = %s, userRole = %s, phone = %s, updatedAt = NOW()
        WHERE userID = %s
    """, (full_name, email, role, phone, user_id))
    mysql.connection.commit()
    cur.close()


def delete_user(user_id):
    """Delete a user by ID."""
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM USERS WHERE userID = %s", (user_id,))
    mysql.connection.commit()
    cur.close()
