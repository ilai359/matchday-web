import Foundation
import UIKit
import Capacitor
import EventKit
import EventKitUI
import WidgetKit

/// Clubside's own native features, callable from the website running inside
/// the app (see src/lib/nativeApp.ts):
///   - setWidgetData: saves the followed clubs + their matches for the
///     home-screen widget (and the offline screen), then refreshes the widget
///   - getWidgetData: reads that saved copy back (used by the offline screen)
///   - addToCalendar: opens Apple's own "add event" sheet for a match
///   - haptic: a small vibration (tap, success, warning)
///   - shareImage: the iPhone share sheet with a match/club image
@objc(ClubsideNativePlugin)
public class ClubsideNativePlugin: CAPPlugin, CAPBridgedPlugin, EKEventEditViewDelegate {
    public let identifier = "ClubsideNativePlugin"
    public let jsName = "ClubsideNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addToCalendar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.ilai.clubside"
    static let widgetDataKey = "widgetData"

    private let eventStore = EKEventStore()
    private var pendingCalendarCall: CAPPluginCall?

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: ClubsideNativePlugin.appGroup)
    }

    // MARK: - Widget data

    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json")
            return
        }
        let defaults = sharedDefaults ?? UserDefaults.standard
        defaults.set(json, forKey: ClubsideNativePlugin.widgetDataKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func getWidgetData(_ call: CAPPluginCall) {
        let defaults = sharedDefaults ?? UserDefaults.standard
        let json = defaults.string(forKey: ClubsideNativePlugin.widgetDataKey) ?? ""
        call.resolve(["json": json])
    }

    // MARK: - Calendar

    @objc func addToCalendar(_ call: CAPPluginCall) {
        guard let title = call.getString("title"),
              let startString = call.getString("start"),
              let start = ClubsideNativePlugin.parseDate(startString) else {
            call.reject("Missing title or start")
            return
        }
        let minutes = call.getInt("durationMinutes") ?? 120
        let location = call.getString("location")
        let notes = call.getString("notes")
        let urlString = call.getString("url")

        let present = { [weak self] in
            guard let self = self else { return }
            let event = EKEvent(eventStore: self.eventStore)
            event.title = title
            event.startDate = start
            event.endDate = start.addingTimeInterval(TimeInterval(minutes * 60))
            if let location = location, !location.isEmpty { event.location = location }
            if let notes = notes, !notes.isEmpty { event.notes = notes }
            if let urlString = urlString, let url = URL(string: urlString) { event.url = url }
            event.addAlarm(EKAlarm(relativeOffset: -30 * 60))

            let editor = EKEventEditViewController()
            editor.eventStore = self.eventStore
            editor.event = event
            editor.editViewDelegate = self
            self.pendingCalendarCall = call
            self.bridge?.viewController?.present(editor, animated: true)
        }

        DispatchQueue.main.async {
            if #available(iOS 17.0, *) {
                // iOS 17+: Apple's add-event sheet needs no calendar permission.
                present()
            } else {
                self.eventStore.requestAccess(to: .event) { granted, _ in
                    DispatchQueue.main.async {
                        if granted {
                            present()
                        } else {
                            call.reject("Calendar access was not allowed")
                        }
                    }
                }
            }
        }
    }

    public func eventEditViewController(_ controller: EKEventEditViewController,
                                        didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
        let saved = action == .saved
        if saved {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        pendingCalendarCall?.resolve(["saved": saved])
        pendingCalendarCall = nil
    }

    // MARK: - Haptics

    @objc func haptic(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "light"
        DispatchQueue.main.async {
            switch style {
            case "success":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            case "warning":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            case "error":
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            case "selection":
                UISelectionFeedbackGenerator().selectionChanged()
            case "medium":
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            case "heavy":
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            default:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
            call.resolve()
        }
    }

    // MARK: - Share sheet

    @objc func shareImage(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let filename = call.getString("filename") ?? "clubside.png"
        var items: [Any] = []

        if let base64 = call.getString("base64") {
            let cleaned = base64.components(separatedBy: ",").last ?? base64
            if let data = Data(base64Encoded: cleaned) {
                let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
                do {
                    try data.write(to: url, options: .atomic)
                    items.append(url)
                } catch {
                    if let image = UIImage(data: data) { items.append(image) }
                }
            }
        }
        if !text.isEmpty { items.append(text) }
        if let urlString = call.getString("url"), let url = URL(string: urlString) {
            items.append(url)
        }
        guard !items.isEmpty else {
            call.reject("Nothing to share")
            return
        }

        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("No screen to show the share sheet on")
                return
            }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX,
                                            y: presenter.view.bounds.maxY - 80,
                                            width: 1, height: 1)
            }
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["completed": completed])
            }
            presenter.present(sheet, animated: true)
        }
    }

    // MARK: - Helpers

    static func parseDate(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: value)
    }
}
