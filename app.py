from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

DATABASE = "tracking.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT,
            description TEXT,
            date TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


@app.route("/")
def home():
    return render_template("index.html")


# Get all transactions
@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    conn = get_db_connection()

    transactions = conn.execute("""
        SELECT *
        FROM transactions
        ORDER BY date DESC, id DESC
    """).fetchall()

    conn.close()

    return jsonify([
        dict(transaction)
        for transaction in transactions
    ])


# Add transaction
@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    data = request.get_json()

    transaction_type = data.get("type")
    amount = data.get("amount")
    category = data.get("category", "")
    description = data.get("description", "")
    date = data.get("date")

    if not transaction_type or amount is None or not date:
        return jsonify({
            "error": "type, amount and date are required"
        }), 400

    if transaction_type not in ["income", "expense"]:
        return jsonify({
            "error": "type must be income or expense"
        }), 400

    try:
        amount = float(amount)

        if amount <= 0:
            raise ValueError()

    except (ValueError, TypeError):
        return jsonify({
            "error": "amount must be greater than 0"
        }), 400

    conn = get_db_connection()

    cursor = conn.execute("""
        INSERT INTO transactions
        (type, amount, category, description, date)
        VALUES (?, ?, ?, ?, ?)
    """, (
        transaction_type,
        amount,
        category,
        description,
        date
    ))

    conn.commit()

    transaction_id = cursor.lastrowid

    transaction = conn.execute(
        "SELECT * FROM transactions WHERE id = ?",
        (transaction_id,)
    ).fetchone()

    conn.close()

    return jsonify(dict(transaction)), 201


# Delete transaction
@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):
    conn = get_db_connection()

    transaction = conn.execute(
        "SELECT * FROM transactions WHERE id = ?",
        (transaction_id,)
    ).fetchone()

    if transaction is None:
        conn.close()

        return jsonify({
            "error": "Transaction not found"
        }), 404

    conn.execute(
        "DELETE FROM transactions WHERE id = ?",
        (transaction_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Transaction deleted"
    })


# Dashboard totals
@app.route("/api/summary", methods=["GET"])
def get_summary():
    conn = get_db_connection()

    income = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'income'
    """).fetchone()[0]

    expenses = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE type = 'expense'
    """).fetchone()[0]

    conn.close()

    balance = income - expenses

    return jsonify({
        "income": income,
        "expenses": expenses,
        "balance": balance
    })


if __name__ == "__main__":
    init_db()
    app.run(debug=True)