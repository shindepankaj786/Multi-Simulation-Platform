import sys
from flask import Flask, request, jsonify
from g4f.client import Client
import g4f

app = Flask(__name__)
client = Client()

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    system_prompt = data.get('systemPrompt', '')
    user_text = data.get('userText', '')

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text}
    ]

    try:
        import g4f
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            provider=g4f.Provider.Cloudflare,
            messages=messages
        )
        return jsonify({"response": response.choices[0].message.content})
    except Exception as e:
        print(f"AI API failed: {str(e)}", flush=True)
        return jsonify({"error": "All AI providers failed"}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
