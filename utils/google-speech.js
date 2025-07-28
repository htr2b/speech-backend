import speech from '@google-cloud/speech'

// Instantiates a client
// Kimlik doğrulaması için credentials.json’u kullanarak Google Cloud’a bağlanan bir istemci yaratıyor.
const client = new speech.SpeechClient()

export let transcription = ''

async function transcribeSpeech(gcsUri) {

  const audio = { // Which audio file ? 
    uri: gcsUri,
  }

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const config = {
    encoding: 'MP3',       // Sesin formatı
    sampleRateHertz: 16000,     // Örnekleme Hızı
    languageCode: 'en-US',      // Dil
    alternativeLanguageCodes: ['tr-TR', 'de-DE', 'fr-FR']
  }

  const request = {
    audio: audio,               // Hangi ses
    config: config,             // Nasıl işlenecek
  }


  const [operation] = await client.longRunningRecognize(request)
  const [response] = await operation.promise() // .promise işlemin bitmesini bekler ve responseye verir
  transcription = response.results
    .map(result => result.alternatives[0].transcript) // Google alternatifler üretebiliyor ilk alternatif alternatives[0]
    .join(' ')
    .replace(/\s+/g, ' ')

  return transcription
}

export default transcribeSpeech


