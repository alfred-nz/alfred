import Foundation
import Speech
import AVFoundation

func emit(_ value: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: value), let line = String(data: data, encoding: .utf8) { print(line); fflush(stdout) }
}
let engine = AVAudioEngine()
var task: SFSpeechRecognitionTask?
var request: SFSpeechAudioBufferRecognitionRequest?
func start() {
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-GB")), recognizer.isAvailable else {
        emit(["error": "Mac speech recognition is unavailable. Check the speech language in System Settings, or use ElevenLabs."]); exit(1)
    }
    guard recognizer.supportsOnDeviceRecognition else {
        emit(["error": "On-device English speech recognition is not available. Install the Mac speech language or use your ElevenLabs connection."]); exit(1)
    }
    let r = SFSpeechAudioBufferRecognitionRequest()
    r.shouldReportPartialResults = true
    r.requiresOnDeviceRecognition = true
    request = r
    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0 else { emit(["error": "No microphone input is available."]); exit(1) }
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in r.append(buffer) }
    task = recognizer.recognitionTask(with: r) { result, error in
        if let result = result { emit(["text": result.bestTranscription.formattedString, "final": result.isFinal]); if result.isFinal { engine.stop(); exit(0) } }
        if let error = error { emit(["error": error.localizedDescription]); engine.stop(); exit(1) }
    }
    do { engine.prepare(); try engine.start(); emit(["listening": true]) }
    catch { emit(["error": error.localizedDescription]); exit(1) }
}
SFSpeechRecognizer.requestAuthorization { status in
    guard status == .authorized else { emit(["error": "Allow Alfred Speech in System Settings → Privacy & Security → Speech Recognition."]); exit(1) }
    AVCaptureDevice.requestAccess(for: .audio) { granted in
        guard granted else { emit(["error": "Allow Alfred Speech microphone access in System Settings → Privacy & Security → Microphone."]); exit(1) }
        DispatchQueue.main.async { start() }
    }
}
RunLoop.main.run()
