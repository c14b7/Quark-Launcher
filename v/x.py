import json
import os
import subprocess

def get_installed_xbox_games():
    games = []
    try:
        result = subprocess.run([
            "powershell", "-Command",
            "Get-AppxPackage | Where-Object { $_.SignatureKind -eq 'Store' -and $_.IsFramework -eq $false -and $_.NonRemovable -eq $false } | "
            "Select-Object Name, InstallLocation, PackageFamilyName"
        ], capture_output=True, text=True, check=True)
        
        lines = result.stdout.splitlines()
        for line in lines[3:]:  # Pomijamy nagłówek
            parts = line.strip().split()
            if len(parts) >= 3:
                name = parts[0]
                install_location = parts[1]
                package_family_name = parts[2]
                game_path = os.path.join(install_location, "MicrosoftGame.config")
                if os.path.exists(game_path):
                    # Generowanie URI na podstawie PackageFamilyName
                    game_uri = f"ms-xbl-{package_family_name.split('_')[0]}://launch/"
                    games.append({
                        "name": name, 
                        "install_location": install_location,
                        "package_family_name": package_family_name,
                        "game_uri": game_uri
                    })
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
