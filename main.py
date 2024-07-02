import sys
from piped_api import PipedClient

def get_audio_url(video_id):
    client = PipedClient()
    video = client.get_video(video_id)
    audio_stream = video.get_streams('audio')[0]
    return audio_stream.url

if __name__ == "__main__":
    video_id = sys.argv[1]
    print(get_audio_url(video_id))