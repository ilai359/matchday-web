import json
import subprocess
import time

api_key = None
with open(".env.local") as f:
    for line in f:
        if line.startswith("FOOTBALL_DATA_API_KEY="):
            api_key = line.strip().split("=", 1)[1]

codes = ["PL", "PD", "BL1", "FL1", "SA", "DED", "PPL"]

for code in codes:
    print(f"=== {code} ===")
    result = subprocess.run(
        ["curl", "-s", "-H", f"X-Auth-Token: {api_key}",
         f"https://api.football-data.org/v4/competitions/{code}/teams"],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    teams = data.get("teams")
    if teams is None:
        print("ERROR:", data)
    else:
        for t in teams:
            print(f"{t['id']}|{t['name']}|{t.get('shortName','')}|{t.get('crest','')}")
    time.sleep(6)
