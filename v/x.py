import json
import os
import subprocess

def get_installed_xbox_games():
    games = []
    try:
        result = subprocess.run([
            "powershell", "-Command",
            "Get-AppxPackage | Where-Object { $_.SignatureKind -eq 'Store' -and $_.IsFramework -eq $false -and $_.NonRemovable -eq $false } | "
            "Select-Object Name, InstallLocation"
        ], capture_output=True, text=True, check=True)
        
        lines = result.stdout.splitlines()
        for line in lines[3:]:  # Pomijamy nagłówek
            parts = line.strip().split(None, 1)
            if len(parts) == 2:
                name, install_location = parts
                game_path = os.path.join(install_location, "MicrosoftGame.config")
                if os.path.exists(game_path):
                    games.append({"name": name, "install_location": install_location})
    except subprocess.CalledProcessError as e:
        print("Błąd podczas pobierania listy gier:", e)
    return games

def save_to_json(games, filename="xbox_games.json"):
    with open(filename, "w", encoding="utf-8") as json_file:
        json.dump(games, json_file, indent=4, ensure_ascii=False)

def main():
    games = get_installed_xbox_games()
    if games:
        save_to_json(games)
        print("Zapisano listę gier do pliku xbox_games.json")
    else:
        print("Nie znaleziono zainstalowanych gier Xbox.")

if __name__ == "__main__":
    main()
