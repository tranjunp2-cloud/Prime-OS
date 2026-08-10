from primeos_tts.text import clean_script
from primeos_tts.voices import get_voice, list_voices, resolve_lang_code


def test_clean_script_removes_markdown_without_losing_link_label():
    script = """---\ntitle: Demo\n---\n# PrimeOS\n\nHello **world**. See [the dashboard](https://example.com).\n\n```js\nconsole.log('skip')\n```\n"""

    assert clean_script(script) == "PrimeOS\n\nHello world. See the dashboard."


def test_voice_catalog_resolves_aliases():
    voice = get_voice("af_heart")

    assert voice.lang_code == "a"
    assert resolve_lang_code("en-us", voice.name) == "a"
    assert len(list_voices("en")) == 20


def test_clean_script_rejects_empty_content():
    try:
        clean_script("```text\nremoved\n```")
    except ValueError as error:
        assert "no speakable text" in str(error)
    else:
        raise AssertionError("Expected empty scripts to be rejected")
