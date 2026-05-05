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
