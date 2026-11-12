import UIKit
import WebKit
import Capacitor

/// The app's main screen. Same as Capacitor's own screen, plus:
///   - Clubside's native features (see ClubsideNativePlugin.swift)
///   - the screens are built into the app (public/), or newer ones the app
///     downloaded from the website by itself (see ScreensUpdater below)
///   - page addresses like /matches open the right built-in page
class ClubsideViewController: CAPBridgeViewController {
    static let siteURL = "https://matchday-web-zeta.vercel.app"

    private var wentToBackgroundAt: Date?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ClubsideNativePlugin())

        NotificationCenter.default.addObserver(
            self, selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    override open func router() -> Router {
        return ClubsideRouter()
    }

    override open func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        // Newer screens downloaded earlier, if there are any (and they
        // worked last time) - otherwise the ones built into the app.
        if let downloaded = ScreensUpdater.shared.screensForLaunch() {
            descriptor.appLocation = downloaded
        }
        return descriptor
    }

    /// Opens a page, for links like clubside://match/123 that come from the
    /// home-screen widget.
    func open(deepLink url: URL) {
        guard url.scheme == "clubside" else { return }
        var path = "/"
        if let host = url.host, !host.isEmpty {
            path = "/" + host + url.path
        }
        // Only ever open pages of Clubside itself.
        let allowed = ["/", "/matches", "/clubs", "/updates", "/settings"]
        var target: String?
        if allowed.contains(path) {
            target = path
        } else if path.hasPrefix("/match/") {
            target = "/match?id=" + Self.queryValue(String(path.dropFirst("/match/".count)))
        } else if path.hasPrefix("/clubs/") {
            target = "/club?id=" + Self.queryValue(String(path.dropFirst("/clubs/".count)))
        }
        guard let target = target else { return }
        let base = bridge?.config.serverURL.absoluteString ?? "capacitor://localhost"
        let trimmedBase = base.hasSuffix("/") ? String(base.dropLast()) : base
        guard let address = URL(string: trimmedBase + target) else { return }
        webView?.load(URLRequest(url: address))
    }

    private static func queryValue(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
    }

    // MARK: - Switching to newer screens

    @objc private func appDidEnterBackground() {
        wentToBackgroundAt = Date()
    }

    /// Newer screens that finished downloading are used from the next
    /// start - or right away when the app comes back after a while, which
    /// feels the same as a fresh start.
    @objc private func appWillEnterForeground() {
        guard let since = wentToBackgroundAt, Date().timeIntervalSince(since) > 15 * 60 else { return }
        if let newer = ScreensUpdater.shared.takeReadyScreens() {
            setServerBasePath(path: newer.path)
            ScreensUpdater.shared.watchStart(on: self)
        }
    }

    /// Goes back to the screens built into the app (after downloaded
    /// screens didn't start).
    func useBuiltInScreens() {
        guard let builtIn = Bundle.main.url(forResource: "public", withExtension: nil) else { return }
        setServerBasePath(path: builtIn.path)
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        if ScreensUpdater.shared.isUsingDownloadedScreens {
            ScreensUpdater.shared.watchStart(on: self)
        }
    }
}

/// Finds the right built-in file for a page address: /matches is
/// matches.html, / is index.html, /match?id=1 is match.html. Files like
/// /_next/static/... are served as they are.
struct ClubsideRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        if !URL(fileURLWithPath: path).pathExtension.isEmpty {
            return basePath + path
        }
        var page = path
        while page.count > 1 && page.hasSuffix("/") {
            page.removeLast()
        }
        if page.isEmpty || page == "/" {
            return basePath + "/index.html"
        }
        for candidate in [page + ".html", page + "/index.html"]
        where FileManager.default.fileExists(atPath: basePath + candidate) {
            return basePath + candidate
        }
        return basePath + "/index.html"
    }
}

/// Keeps the app's screens up to date without a new App Store version.
///
/// Every website deploy also publishes the newest screens at
/// /app-bundle/manifest.json (scripts/build-app-bundle.mjs). After the app
/// starts, it checks that list; if there are newer screens made for this
/// app build, it downloads them quietly and uses them from the next start.
/// If downloaded screens ever fail to start, the app goes back to the ones
/// it came with. A new App Store version always starts with its own.
final class ScreensUpdater {
    static let shared = ScreensUpdater()

    private struct Manifest: Decodable {
        struct File: Decodable {
            let path: String
            let size: Int
        }
        let version: String
        let minAppBuild: Int
        let files: [File]
    }

    private enum Key {
        static let active = "screens.active"
        static let activeBuild = "screens.activeBuild"
        static let ready = "screens.ready"
        static let readyBuild = "screens.readyBuild"
        static let unconfirmedStarts = "screens.unconfirmedStarts"
        static let broken = "screens.broken"
    }

    private let defaults = UserDefaults.standard
    private let files = FileManager.default
    private var checking = false
    private var confirmed = false
    private(set) var isUsingDownloadedScreens = false

    private var appBuild: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
    }

    private var folder: URL {
        let base = files.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("ClubsideScreens", isDirectory: true)
    }

    private var builtInVersion: String? {
        guard let url = Bundle.main.url(forResource: "app-bundle", withExtension: "json", subdirectory: "public"),
              let data = try? Data(contentsOf: url),
              let info = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return info["version"] as? String
    }

    private func screensFolder(_ version: String) -> URL {
        folder.appendingPathComponent(version, isDirectory: true)
    }

    private func isComplete(_ version: String) -> Bool {
        files.fileExists(atPath: screensFolder(version).appendingPathComponent("index.html").path)
    }

    private var brokenVersions: [String] {
        defaults.stringArray(forKey: Key.broken) ?? []
    }

    private func markBroken(_ version: String) {
        var list = brokenVersions
        if !list.contains(version) { list.append(version) }
        defaults.set(Array(list.suffix(20)), forKey: Key.broken)
    }

    private var activeVersion: String? {
        guard let version = defaults.string(forKey: Key.active),
              defaults.string(forKey: Key.activeBuild) == appBuild,
              isComplete(version) else { return nil }
        return version
    }

    /// The screens in use right now (downloaded or built in).
    var currentVersion: String? {
        activeVersion ?? builtInVersion
    }

    /// Screens to start with, or nil for the built-in ones.
    func screensForLaunch() -> URL? {
        // Screens finished downloading last time: use them from now on.
        if let ready = defaults.string(forKey: Key.ready),
           defaults.string(forKey: Key.readyBuild) == appBuild,
           isComplete(ready) {
            defaults.set(ready, forKey: Key.active)
            defaults.set(appBuild, forKey: Key.activeBuild)
            defaults.set(0, forKey: Key.unconfirmedStarts)
        }
        defaults.removeObject(forKey: Key.ready)

        guard let version = activeVersion else {
            defaults.removeObject(forKey: Key.active)
            return nil
        }
        // Two starts in a row where these screens never reported in: they
        // don't work on this phone - back to the built-in ones.
        let unconfirmed = defaults.integer(forKey: Key.unconfirmedStarts)
        if unconfirmed >= 2 {
            markBroken(version)
            defaults.removeObject(forKey: Key.active)
            defaults.set(0, forKey: Key.unconfirmedStarts)
            return nil
        }
        defaults.set(unconfirmed + 1, forKey: Key.unconfirmedStarts)
        isUsingDownloadedScreens = true
        return screensFolder(version)
    }

    /// Newer screens that are downloaded and ready, now made the active ones.
    func takeReadyScreens() -> URL? {
        guard let ready = defaults.string(forKey: Key.ready),
              defaults.string(forKey: Key.readyBuild) == appBuild,
              isComplete(ready) else { return nil }
        defaults.removeObject(forKey: Key.ready)
        defaults.set(ready, forKey: Key.active)
        defaults.set(appBuild, forKey: Key.activeBuild)
        defaults.set(1, forKey: Key.unconfirmedStarts)
        confirmed = false
        isUsingDownloadedScreens = true
        return screensFolder(ready)
    }

    /// If downloaded screens haven't reported in 20 seconds after starting,
    /// switch back to the built-in ones right away.
    func watchStart(on screen: ClubsideViewController) {
        confirmed = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self, weak screen] in
            guard let self = self, let screen = screen, !self.confirmed, self.isUsingDownloadedScreens,
                  UIApplication.shared.applicationState == .active,
                  let version = self.activeVersion else { return }
            self.markBroken(version)
            self.defaults.removeObject(forKey: Key.active)
            self.defaults.set(0, forKey: Key.unconfirmedStarts)
            self.isUsingDownloadedScreens = false
            screen.useBuiltInScreens()
        }
    }

    /// The screens started fine (called from the screens themselves).
    func screensLoaded() {
        confirmed = true
        defaults.set(0, forKey: Key.unconfirmedStarts)
        Task.detached(priority: .background) { [weak self] in
            await self?.checkForNewerScreens()
        }
    }

    // MARK: - Downloading

    private func checkForNewerScreens() async {
        if checking { return }
        checking = true
        defer { checking = false }

        guard let manifestURL = URL(string: ClubsideViewController.siteURL + "/app-bundle/manifest.json") else { return }
        var request = URLRequest(url: manifestURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 15
        guard let result = try? await URLSession.shared.data(for: request),
              (result.1 as? HTTPURLResponse)?.statusCode == 200,
              let manifest = try? JSONDecoder().decode(Manifest.self, from: result.0) else { return }

        let version = manifest.version
        guard version.range(of: "^[a-z0-9]{6,40}$", options: .regularExpression) != nil,
              version != currentVersion,
              version != defaults.string(forKey: Key.ready),
              !brokenVersions.contains(version),
              manifest.minAppBuild <= (Int(appBuild) ?? 0),
              !manifest.files.isEmpty else { return }

        let download = folder.appendingPathComponent(".download-\(version)", isDirectory: true)
        try? files.removeItem(at: download)
        do {
            try files.createDirectory(at: download, withIntermediateDirectories: true)
            try await downloadAll(manifest.files, version: version, into: download)
            let target = screensFolder(version)
            try? files.removeItem(at: target)
            try files.moveItem(at: download, to: target)
            var excluded = URLResourceValues()
            excluded.isExcludedFromBackup = true
            var folderURL = folder
            try? folderURL.setResourceValues(excluded)
        } catch {
            try? files.removeItem(at: download)
            return
        }

        defaults.set(version, forKey: Key.ready)
        defaults.set(appBuild, forKey: Key.readyBuild)
        removeOldScreens(keeping: [version, activeVersion].compactMap { $0 })
    }

    private func downloadAll(_ list: [Manifest.File], version: String, into download: URL) async throws {
        // Six at a time.
        var index = 0
        while index < list.count {
            let batch = Array(list[index..<min(index + 6, list.count)])
            index += batch.count
            try await withThrowingTaskGroup(of: Void.self) { group in
                for file in batch {
                    group.addTask {
                        try await self.downloadOne(file, version: version, into: download)
                    }
                }
                try await group.waitForAll()
            }
        }
    }

    private func downloadOne(_ file: Manifest.File, version: String, into download: URL) async throws {
        let parts = file.path.split(separator: "/").map(String.init)
        guard !parts.isEmpty, !parts.contains(".."), !parts.contains("."),
              let encoded = file.path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "\(ClubsideViewController.siteURL)/app-bundle/\(version)/\(encoded)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200, data.count == file.size else {
            throw URLError(.badServerResponse)
        }
        let destination = parts.reduce(download) { $0.appendingPathComponent($1) }
        try files.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: destination)
    }

    private func removeOldScreens(keeping: [String]) {
        guard let names = try? files.contentsOfDirectory(atPath: folder.path) else { return }
        for name in names where !keeping.contains(name) && !name.hasPrefix(".download-") {
            try? files.removeItem(at: folder.appendingPathComponent(name))
        }
    }
}
