using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Speech.Synthesis;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Automation;
using System.Windows.Forms;

// No shell, global SendKeys, elevation, or arbitrary executable launch interface.
class AlfredNative {
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 2097152 };
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [STAThread] static int Main(string[] args) {
        Console.OutputEncoding = new UTF8Encoding(false); Console.InputEncoding = new UTF8Encoding(false);
        try {
            var mode = args.Length == 1 ? args[0] : "";
            if (mode == "fixture") { Fixture(); return 0; }
            if (mode == "listen") { Listen(); return 0; }
            if (mode != "request") throw new Exception("Unknown native mode.");
            var input = Console.In.ReadToEnd();
            if (input.Length > 20000) throw new Exception("Request is too large.");
            var request = Json.Deserialize<Dictionary<string, object>>(input);
            Emit(new { ok = true, data = Request(request) }); return 0;
        } catch (Exception error) { Emit(new { ok = false, error = error.Message }); return 1; }
    }
    static void Emit(object data) { Console.WriteLine(Json.Serialize(data)); Console.Out.Flush(); }
    static string Str(Dictionary<string, object> r, string key) { object value; if (!r.TryGetValue(key,out value) || !(value is string)) throw new Exception("Missing string: " + key); return (string)value; }
    static long Num(Dictionary<string, object> r, string key) { object value; if (!r.TryGetValue(key,out value)) throw new Exception("Missing identifier."); long n = Convert.ToInt64(value,CultureInfo.InvariantCulture); if(n <= 0) throw new Exception("Invalid identifier."); return n; }
    static string Id(AutomationElement e) { return string.Join(".", e.GetRuntimeId().Select(n => n.ToString(CultureInfo.InvariantCulture))); }
    static List<AutomationElement> Windows() {
        var found = AutomationElement.RootElement.FindAll(TreeScope.Children, Condition.TrueCondition);
        var result = new List<AutomationElement>();
        foreach (AutomationElement e in found) { try { if(e.Current.NativeWindowHandle != 0 && !e.Current.IsOffscreen) result.Add(e); } catch(ElementNotAvailableException) {} }
        return result;
    }
    static object WindowInfo(AutomationElement e) { return new { window_id = (long)e.Current.NativeWindowHandle, process_id = e.Current.ProcessId, title = e.Current.Name }; }
    static AutomationElement Root(Dictionary<string,object> r, bool validate) {
        var hwnd = new IntPtr(Num(r,"window_id"));
        if(!IsWindow(hwnd)) throw new Exception("The window no longer exists. Observe again.");
        uint pid; GetWindowThreadProcessId(hwnd,out pid);
        var root = AutomationElement.FromHandle(hwnd);
        if(validate && ((long)pid != Num(r,"process_id") || Process.GetProcessById((int)pid).StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture) != Str(r,"process_start") || Id(root) != Str(r,"root_id") || root.Current.Name != Str(r,"window_name"))) throw new Exception("The target changed since observation. Observe again.");
        return root;
    }
    static List<AutomationElement> Elements(AutomationElement root) {
        var found = new List<AutomationElement>();
        var queue = new Queue<Tuple<AutomationElement,int>>(); queue.Enqueue(Tuple.Create(root,0));
        while(queue.Count > 0 && found.Count < 400) {
            var item = queue.Dequeue(); found.Add(item.Item1);
            if(item.Item2 >= 8) continue;
            try {
                var child = TreeWalker.ControlViewWalker.GetFirstChild(item.Item1); int siblings = 0;
                while(child != null && siblings++ < 100 && queue.Count < 400) { queue.Enqueue(Tuple.Create(child,item.Item2+1)); child = TreeWalker.ControlViewWalker.GetNextSibling(child); }
            } catch(ElementNotAvailableException) {}
        }
        return found;
    }
    static object Describe(AutomationElement e) {
        var c = e.Current; var value = ""; object pattern;
        if(!c.IsPassword && e.TryGetCurrentPattern(ValuePattern.Pattern,out pattern)) { value = ((ValuePattern)pattern).Current.Value; if(value.Length > 2000) value = value.Substring(0,2000); }
        return new { id = Id(e), name = c.IsPassword ? "Password field" : c.Name, control_type = c.ControlType.ProgrammaticName, enabled = c.IsEnabled, password = c.IsPassword, value = value };
    }
    static object Request(Dictionary<string,object> r) {
        string op = Str(r,"operation");
        if(op == "health") return new { platform = "windows", desktop = "UI Automation", speech_recognizers = SpeechRecognitionEngine.InstalledRecognizers().Select(x => x.Culture.Name).ToArray() };
        if(op == "apps") return new { apps = Windows().GroupBy(x => x.Current.ProcessId).Select(g => new { process_id = g.Key, name = Process.GetProcessById(g.Key).ProcessName, windows = g.Count() }).ToArray() };
        if(op == "windows") return new { windows = Windows().Where(e => e.Current.ProcessId == Num(r,"process_id")).Select(WindowInfo).ToArray() };
        if(op == "speak" || op == "speech_wav") {
            string text = Str(r,"text"); if(text.Length > 4000) throw new Exception("Speech text is too long.");
            using(var synth = new SpeechSynthesizer()) {
                if(op == "speech_wav") { using(var audio = new MemoryStream()) { synth.SetOutputToWaveStream(audio); synth.Speak(text); return new { audio = Convert.ToBase64String(audio.ToArray()) }; } }
                synth.SetOutputToDefaultAudioDevice(); synth.Speak(text); return new { spoken = true };
            }
        }
        if(!new [] {"observe","click","type"}.Contains(op)) throw new Exception("Unknown Windows operation.");
        var root = Root(r,op != "observe");
        if(op == "observe") {
            var elements = new List<object>(); foreach(var item in Elements(root)) { try { elements.Add(Describe(item)); } catch(ElementNotAvailableException) {} }
            return new { window_id = Num(r,"window_id"), process_id = root.Current.ProcessId, process_start = Process.GetProcessById(root.Current.ProcessId).StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture), window_name = root.Current.Name, root_id = Id(root), elements = elements };
        }
        var target = Elements(root).FirstOrDefault(e => Id(e) == Str(r,"element"));
        if(target == null || !target.Current.IsEnabled || target.Current.IsPassword || target.Current.IsOffscreen) throw new Exception("The observed element is unavailable, disabled, offscreen or protected. Observe again.");
        object p;
        if(op == "type") {
            string text = Str(r,"text"); if(text.Length > 10000 || text.IndexOf('\0') >= 0) throw new Exception("Invalid text.");
            if(!target.TryGetCurrentPattern(ValuePattern.Pattern,out p) || ((ValuePattern)p).Current.IsReadOnly) throw new Exception("This field does not expose editable UI Automation text. Use browser tools where appropriate.");
            ((ValuePattern)p).SetValue(text);
            if(((ValuePattern)p).Current.Value != text) throw new Exception("The text change could not be verified. Observe before retrying.");
            return new { action = "set_value", verified = true, window_id = Num(r,"window_id") };
        }
        if(target.TryGetCurrentPattern(InvokePattern.Pattern,out p)) { ((InvokePattern)p).Invoke(); return new { action = "invoke", dispatched = true, needs_observation = true }; }
        if(target.TryGetCurrentPattern(SelectionItemPattern.Pattern,out p)) { ((SelectionItemPattern)p).Select(); return new { action = "select", verified = ((SelectionItemPattern)p).Current.IsSelected }; }
        if(target.Current.IsKeyboardFocusable) { target.SetFocus(); return new { action = "focus", verified = target.Current.HasKeyboardFocus }; }
        throw new Exception("This control does not support a semantic action. No global click was attempted.");
    }
    static void Listen() {
        var installed = SpeechRecognitionEngine.InstalledRecognizers();
        if(installed.Count == 0) { Emit(new { error = "No offline Windows speech recognizer is installed. Add a speech language in Windows Settings or select ElevenLabs." }); return; }
        var selected = installed.FirstOrDefault(r => r.Culture.Equals(CultureInfo.CurrentUICulture)) ?? installed.FirstOrDefault(r => r.Culture.TwoLetterISOLanguageName == "en") ?? installed[0];
        using(var recognizer = new SpeechRecognitionEngine(selected)) {
            recognizer.LoadGrammar(new DictationGrammar()); recognizer.SetInputToDefaultAudioDevice();
            var done = new ManualResetEvent(false);
            recognizer.SpeechHypothesized += (s,e) => Emit(new { text = e.Result.Text, final = false });
            recognizer.SpeechRecognized += (s,e) => { Emit(new { text = e.Result.Text, final = true }); done.Set(); };
            recognizer.RecognizeCompleted += (s,e) => { if(e.Error != null) Emit(new { error = e.Error.Message }); else if(e.Result == null) Emit(new { error = "No speech detected. Check your microphone and try again." }); done.Set(); };
            Emit(new { listening = true }); recognizer.RecognizeAsync(RecognizeMode.Single); done.WaitOne(TimeSpan.FromSeconds(60)); recognizer.RecognizeAsyncCancel();
        }
    }
    // Disposable self-test window; never used by the assistant tool catalog.
    static void Fixture() {
        Application.EnableVisualStyles();
        var form = new Form { Text = "Alfred disposable automation test", Width = 500, Height = 250 };
        var input = new TextBox { AccessibleName = "Sample note", Left = 20, Top = 20, Width = 420 };
        var secret = new TextBox { AccessibleName = "Protected test field", UseSystemPasswordChar = true, Text = "test-only-password", Left = 20, Top = 60, Width = 420 };
        var label = new Label { Text = "Not clicked", Left = 20, Top = 140, Width = 420 };
        var button = new Button { AccessibleName = "Confirm test", Text = "Confirm test", Left = 20, Top = 100, Width = 180 };
        button.Click += (s,e) => { label.Text = "Clicked: " + input.Text; };
        form.Controls.AddRange(new Control [] { input,secret,button,label });
        form.Shown += (s,e) => Emit(new { window_id = form.Handle.ToInt64(), process_id = Process.GetCurrentProcess().Id });
        Application.Run(form);
    }
}
