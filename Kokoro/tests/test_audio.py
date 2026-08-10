import numpy as np
import soundfile as sf

from primeos_tts.audio import write_audio
from primeos_tts.engine import SynthesisResult


def test_write_audio_creates_wav(tmp_path):
    sample_rate = 24_000
    audio = np.zeros(sample_rate // 10, dtype=np.float32)
    result = SynthesisResult(audio, sample_rate, "af_heart", "a", ())

    output = write_audio(result, tmp_path / "sample.wav")
    info = sf.info(output)

    assert info.samplerate == sample_rate
    assert info.frames == len(audio)
