import sqlite3
from flask import Flask, request, jsonify
import os

app = Flask(__name__, static_folder='public', static_url_path='')

DB_PATH = 'database/retail.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists('database'):
        os.makedirs('database')
    conn = get_db_connection()
    with open('database/schema.sql', 'r') as f:
        conn.executescript(f.read())
    with open('database/seed.sql', 'r') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/api/query', methods=['POST'])
def execute_query():
    data = request.json
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    is_select = query.lower().startswith('select') or query.lower().startswith('pragma')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(query)
        
        if is_select or 'returning' in query.lower():
            rows = cur.fetchall()
            columns = [description[0] for description in cur.description] if cur.description else []
            data = [dict(row) for row in rows]
            conn.commit()
            conn.close()
            return jsonify({'columns': columns, 'data': data})
        else:
            conn.commit()
            changes = conn.total_changes
            conn.close()
            return jsonify({'message': f'Query executed successfully. Rows affected: {changes}'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/reset', methods=['POST'])
def reset_db():
    try:
        init_db()
        return jsonify({'message': 'Database reset successfully!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if not os.path.exists('database'):
        os.makedirs('database')
    if not os.path.exists(DB_PATH):
        init_db()
    print("Server starting at http://localhost:3000")
    app.run(debug=True, port=3000)
