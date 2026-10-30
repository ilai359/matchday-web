import UIKit
import Capacitor

/// The app's main screen. Same as Capacitor's own screen, plus Clubside's
/// native features (see ClubsideNativePlugin.swift).
class ClubsideViewController: CAPBridgeViewController {
    static let siteURL = "https://matchday-web-zeta.vercel.app"

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ClubsideNativePlugin())
    }

    /// Opens a page of the site, for links like clubside://match/123 that
    /// come from the home-screen widget.
    func open(deepLink url: URL) {
        guard url.scheme == "clubside" else { return }
        var path = "/"
        if let host = url.host, !host.isEmpty {
            path = "/" + host + url.path
        }
        // Only ever open pages of Clubside itself.
        let allowed = ["/", "/matches", "/clubs", "/updates", "/settings"]
        let isAllowed = allowed.contains(path)
            || path.hasPrefix("/match/")
            || path.hasPrefix("/clubs/")
        guard isAllowed, let target = URL(string: ClubsideViewController.siteURL + path) else { return }
        webView?.load(URLRequest(url: target))
    }
}
