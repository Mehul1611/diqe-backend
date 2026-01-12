import asyncio
from typing import Dict

class DownloadFiles:
    def __init__(self, input_data: Dict):
        self.input_data = input_data

    async def _download_file(self, file: Dict):
        pass

    async def download_all_files(self):
        files_data = self.input_data.get("files_data")
        print(f"Starting download for {len(files_data)} files...")
        
        tasks = [self._download_file(file) for file in files_data]
        await asyncio.gather(*tasks)
        print("All Files Downloaded Successfully.")