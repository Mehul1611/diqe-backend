import shutil

def clean_specific_folders(base_path: str, folders: List[str]) -> None:
    if not base_path.exists():
        print(f"Base path does not exist: {base_path}")
        return

    for folder_name in folders:
        folder_path = base_path / folder_name
        if folder_path.exists() and folder_path.is_dir():
            try:
                shutil.rmtree(folder_path)
                print(f"Deleted folder: {folder_path}")
            except Exception as e:
                print(f"Failed to delete folder {folder_path}: {e}")
        else:
            print(f"Folder not found or already deleted: {folder_path}")