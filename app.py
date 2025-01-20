from flask import Flask, jsonify, request, render_template
import requests

app = Flask(__name__)

WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_item', methods=['GET'])
def get_item():
    sparql_query = """
    SELECT ?item ?itemLabel ?team ?teamLabel WHERE {
      ?item wdt:P710 ?team.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 1
    """
    headers = {'Accept': 'application/json'}
    response = requests.get(WIKIDATA_ENDPOINT, params={'query': sparql_query}, headers=headers)
    data = response.json()

    if "results" in data and "bindings" in data["results"]:
        result = data["results"]["bindings"][0]
        return jsonify({
            "item": result["item"]["value"],
            "itemLabel": result["itemLabel"]["value"],
            "team": result["team"]["value"],
            "teamLabel": result["teamLabel"]["value"]
        })
    return jsonify({"error": "No data found"}), 404

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    payload = request.json
    item_id = payload.get("item_id")
    correct = payload.get("correct")
    team_id = payload.get("team_id")
    # For now, just log the response (real logic can involve storing or updating Wikidata)
    print(f"Item: {item_id}, Team: {team_id}, Correct: {correct}")
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True)
