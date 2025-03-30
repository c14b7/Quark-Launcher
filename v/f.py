import os
import json
import winreg

def get_steam_install_path():
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
        steam_path, _ = winreg.QueryValueEx(key, "InstallPath")
        return steam_path
    except FileNotFoundError:
        print("Nie znaleziono wpisu Steam w rejestrze.")
        return None

def get_installed_games(steam_path):
    library_folders_file = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
    game_list = []
    
    if not os.path.exists(library_folders_file):
        print("Nie znaleziono pliku libraryfolders.vdf")
        return []
    
    library_folders = [os.path.join(steam_path, "steamapps")]
    
    try:
        with open(library_folders_file, "r", encoding="utf-8") as file:
            data = file.read()
            paths = [line.split('"')[3] for line in data.split('\n') if '"path"' in line]
            for path in paths:
                library_folders.append(os.path.join(path.replace("\\", "\\"), "steamapps"))
    except Exception as e:
        print(f"Błąd podczas odczytu libraryfolders.vdf: {e}")
        return []
    
    for folder in library_folders:
        if os.path.exists(folder):
            for file in os.listdir(folder):
                if file.startswith("appmanifest_") and file.endswith(".acf"):
                    file_path = os.path.join(folder, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            lines = content.split('\n')
                            name = None
                            appid = file.replace("appmanifest_", "").replace(".acf", "").strip()
                            for line in lines:
                                if '"name"' in line:
                                    name = line.split('"')[3]
                                    break
                            if name:
                                game_list.append({"appid": appid, "name": name})
                    except Exception as e:
                        print(f"Błąd podczas odczytu {file_path}: {e}")
    
    return game_list

def save_to_json(games, filename="steam_games.json"):
    with open(filename, "w", encoding="utf-8") as json_file:
        json.dump(games, json_file, indent=4, ensure_ascii=False)

def main():
    steam_path = get_steam_install_path()
    if steam_path:
        games = get_installed_games(steam_path)
        if games:
            save_to_json(games)
            print(f"Zapisano listę gier do pliku steam_games.json")
        else:
            print("Nie znaleziono zainstalowanych gier.")
    else:
        print("Nie udało się znaleźć ścieżki instalacji Steam.")

if __name__ == "__main__":
    main()
