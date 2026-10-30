import WidgetKit
import SwiftUI
import UIKit

// MARK: - Data

/// The same shape /api/widget returns (see src/app/api/widget/route.ts).
struct WidgetTeam: Codable {
    let name: String
    let shortName: String?
    let crest: String?
}

struct WidgetMatch: Codable {
    let id: String
    let utcDate: String
    let status: String
    let minute: Int?
    let competition: String
    let home: WidgetTeam
    let away: WidgetTeam
    let homeScore: Int?
    let awayScore: Int?
}

struct WidgetClub: Codable {
    let id: String
    let name: String
    let shortName: String
    let color: String
    let crest: String?
    let live: WidgetMatch?
    let next: WidgetMatch?
    let last: WidgetMatch?
}

struct WidgetPayload: Codable {
    let generatedAt: String?
    let clubs: [WidgetClub]
}

/// What the app saves for the widget (see ClubsideNativePlugin.setWidgetData).
struct SavedWidgetData: Codable {
    let clubIds: [String]
    let payload: WidgetPayload?
}

enum WidgetStore {
    static let appGroup = "group.com.ilai.clubside"
    static let key = "widgetData"
    static let siteURL = "https://matchday-web-zeta.vercel.app"

    static func loadSaved() -> SavedWidgetData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let json = defaults.string(forKey: key),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(SavedWidgetData.self, from: data)
    }

    static func fetchFresh(clubIds: [String]) async -> WidgetPayload? {
        guard !clubIds.isEmpty else { return nil }
        var components = URLComponents(string: siteURL + "/api/widget")
        components?.queryItems = [URLQueryItem(name: "clubs", value: clubIds.joined(separator: ","))]
        guard let url = components?.url else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 12
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return try JSONDecoder().decode(WidgetPayload.self, from: data)
        } catch {
            return nil
        }
    }

    static func loadCrest(_ urlString: String?) async -> UIImage? {
        guard let urlString = urlString, let url = URL(string: urlString) else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        guard let result = try? await URLSession.shared.data(for: request),
              let image = UIImage(data: result.0) else { return nil }
        // Widgets have very little memory - keep the crests small.
        let size = CGSize(width: 72, height: 72)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            let scale = min(size.width / image.size.width, size.height / image.size.height)
            let drawSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            let origin = CGPoint(x: (size.width - drawSize.width) / 2, y: (size.height - drawSize.height) / 2)
            image.draw(in: CGRect(origin: origin, size: drawSize))
        }
    }
}

// MARK: - Timeline

struct ClubEntry: TimelineEntry {
    let date: Date
    let clubs: [WidgetClub]
    let crests: [String: UIImage]
    let hasClubs: Bool
}

struct ClubProvider: TimelineProvider {
    func placeholder(in context: Context) -> ClubEntry {
        ClubEntry(date: Date(), clubs: [WidgetPreview.club], crests: [:], hasClubs: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (ClubEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        Task {
            completion(await makeEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ClubEntry>) -> Void) {
        Task {
            let entry = await makeEntry()
            completion(Timeline(entries: [entry], policy: .after(nextRefresh(for: entry.clubs))))
        }
    }

    private func makeEntry() async -> ClubEntry {
        let saved = WidgetStore.loadSaved()
        let clubIds = saved?.clubIds ?? []
        let fresh = await WidgetStore.fetchFresh(clubIds: clubIds)
        let clubs = Array((fresh ?? saved?.payload)?.clubs.prefix(3) ?? [])

        var crests: [String: UIImage] = [:]
        for club in clubs {
            var urls = [club.crest]
            if let match = club.live ?? club.next ?? club.last {
                urls.append(match.home.crest)
                urls.append(match.away.crest)
            }
            for case let url? in urls where crests[url] == nil {
                if let image = await WidgetStore.loadCrest(url) {
                    crests[url] = image
                }
            }
        }
        return ClubEntry(date: Date(), clubs: clubs, crests: crests, hasClubs: !clubIds.isEmpty)
    }

    /// Refresh often while a match is live, at kickoff for the next one,
    /// otherwise every half hour.
    private func nextRefresh(for clubs: [WidgetClub]) -> Date {
        let now = Date()
        if clubs.contains(where: { $0.live != nil }) {
            return now.addingTimeInterval(5 * 60)
        }
        let kickoffs = clubs.compactMap { $0.next.flatMap { WidgetFormat.date($0.utcDate) } }
            .filter { $0 > now }
        if let soonest = kickoffs.min(), soonest.timeIntervalSince(now) < 30 * 60 {
            return soonest.addingTimeInterval(60)
        }
        return now.addingTimeInterval(30 * 60)
    }
}

// MARK: - Formatting

enum WidgetFormat {
    static func date(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }

    static func kickoff(_ value: String) -> String {
        guard let date = date(value) else { return "" }
        let calendar = Calendar.current
        let time = DateFormatter()
        time.dateFormat = "HH:mm"
        if calendar.isDateInToday(date) { return "Today \(time.string(from: date))" }
        if calendar.isDateInTomorrow(date) { return "Tomorrow \(time.string(from: date))" }
        let day = DateFormatter()
        day.dateFormat = "EEE d MMM"
        return "\(day.string(from: date)) · \(time.string(from: date))"
    }

    static func liveLabel(_ match: WidgetMatch) -> String {
        if match.status == "PAUSED" { return "HT" }
        if let minute = match.minute { return "\(minute)'" }
        return "LIVE"
    }

    static func score(_ match: WidgetMatch) -> String {
        "\(match.homeScore ?? 0)–\(match.awayScore ?? 0)"
    }

    static func teamName(_ team: WidgetTeam) -> String {
        team.shortName ?? team.name
    }

    /// W / D / L from this club's point of view.
    static func result(_ match: WidgetMatch, for club: WidgetClub) -> String {
        let home = match.homeScore ?? 0
        let away = match.awayScore ?? 0
        if home == away { return "D" }
        let isHome = match.home.name == club.name
            || match.home.shortName == club.shortName
        let won = isHome ? home > away : away > home
        return won ? "W" : "L"
    }
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Views

let clubsideNavy = Color(red: 11 / 255, green: 14 / 255, blue: 22 / 255)
let liveRed = Color(red: 1.0, green: 0.27, blue: 0.27)

struct CrestView: View {
    let image: UIImage?
    let fallback: String
    let color: Color
    let size: CGFloat

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Text(String(fallback.prefix(1)))
                    .font(.system(size: size * 0.5, weight: .black))
                    .foregroundColor(.white)
                    .frame(width: size, height: size)
                    .background(Circle().fill(color))
            }
        }
        .frame(width: size, height: size)
    }
}

struct EmptyClubsView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Clubside")
                .font(.system(size: 15, weight: .black))
                .foregroundColor(.white)
            Text("Open the app and follow a club to see its matches here.")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// One club's most important match: live score, next match, or last result.
struct ClubMatchLine: View {
    let club: WidgetClub
    let crests: [String: UIImage]
    let compact: Bool

    var body: some View {
        if let live = club.live {
            matchRow(live, label: WidgetFormat.liveLabel(live), labelColor: liveRed, showScore: true)
        } else if let next = club.next {
            matchRow(next, label: WidgetFormat.kickoff(next.utcDate), labelColor: .white.opacity(0.6), showScore: false)
        } else if let last = club.last {
            matchRow(last, label: "Full-time · \(WidgetFormat.result(last, for: club))", labelColor: .white.opacity(0.6), showScore: true)
        } else {
            Text("No matches coming up")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.6))
        }
    }

    @ViewBuilder
    private func matchRow(_ match: WidgetMatch, label: String, labelColor: Color, showScore: Bool) -> some View {
        let crestSize: CGFloat = compact ? 22 : 26
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                CrestView(image: match.home.crest.flatMap { crests[$0] }, fallback: match.home.name,
                          color: Color(hex: club.color), size: crestSize)
                Text(showScore ? WidgetFormat.score(match) : "vs")
                    .font(.system(size: showScore ? (compact ? 18 : 20) : 13, weight: .black))
                    .foregroundColor(.white)
                    .monospacedDigit()
                CrestView(image: match.away.crest.flatMap { crests[$0] }, fallback: match.away.name,
                          color: Color(hex: club.color), size: crestSize)
                if !compact {
                    Text("\(WidgetFormat.teamName(match.home)) – \(WidgetFormat.teamName(match.away))")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(1)
                }
            }
            HStack(spacing: 4) {
                if club.live != nil {
                    Circle().fill(liveRed).frame(width: 6, height: 6)
                }
                Text(label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(labelColor)
                    .lineLimit(1)
                if !compact {
                    Text("· \(match.competition)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }
            }
        }
    }
}

struct SmallClubView: View {
    let entry: ClubEntry

    var body: some View {
        if let club = entry.clubs.first {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    CrestView(image: club.crest.flatMap { entry.crests[$0] }, fallback: club.name,
                              color: Color(hex: club.color), size: 20)
                    Text(club.shortName)
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                ClubMatchLine(club: club, crests: entry.crests, compact: true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: deepLink(for: club)))
        } else {
            EmptyClubsView()
        }
    }
}

struct MediumClubView: View {
    let entry: ClubEntry

    var body: some View {
        if entry.clubs.isEmpty {
            EmptyClubsView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Your clubs")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white.opacity(0.55))
                        .textCase(.uppercase)
                    Spacer()
                    Text("Clubside")
                        .font(.system(size: 11, weight: .heavy))
                        .foregroundColor(.white.opacity(0.35))
                }
                ForEach(Array(entry.clubs.prefix(2).enumerated()), id: \.offset) { _, club in
                    Link(destination: URL(string: deepLink(for: club))!) {
                        HStack(alignment: .center, spacing: 8) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: club.color))
                                .frame(width: 4)
                            ClubMatchLine(club: club, crests: entry.crests, compact: false)
                            Spacer(minLength: 0)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockScreenClubView: View {
    let entry: ClubEntry

    var body: some View {
        if let club = entry.clubs.first {
            VStack(alignment: .leading, spacing: 1) {
                Text(club.shortName)
                    .font(.system(size: 13, weight: .black))
                if let live = club.live {
                    Text("\(WidgetFormat.liveLabel(live))  \(WidgetFormat.teamName(live.home)) \(WidgetFormat.score(live)) \(WidgetFormat.teamName(live.away))")
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                } else if let next = club.next {
                    Text("\(WidgetFormat.teamName(next.home)) vs \(WidgetFormat.teamName(next.away))")
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                    Text(WidgetFormat.kickoff(next.utcDate))
                        .font(.system(size: 11))
                        .lineLimit(1)
                } else if let last = club.last {
                    Text("\(WidgetFormat.teamName(last.home)) \(WidgetFormat.score(last)) \(WidgetFormat.teamName(last.away))")
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(URL(string: deepLink(for: club)))
        } else {
            Text("Clubside: follow a club")
                .font(.system(size: 12, weight: .semibold))
        }
    }
}

func deepLink(for club: WidgetClub) -> String {
    if let match = club.live ?? club.next ?? club.last {
        return "clubside://match/\(match.id)"
    }
    return "clubside://clubs/\(club.id)"
}

struct ClubWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: ClubEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumClubView(entry: entry).widgetBackground(clubsideNavy)
        case .accessoryRectangular:
            if #available(iOSApplicationExtension 16.0, *) {
                LockScreenClubView(entry: entry).accessoryBackground()
            } else {
                SmallClubView(entry: entry).widgetBackground(clubsideNavy)
            }
        default:
            SmallClubView(entry: entry).widgetBackground(clubsideNavy)
        }
    }
}

extension View {
    /// iOS 17 wants the background set this way; older versions use padding + background.
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.padding(14).background(color)
        }
    }

    @ViewBuilder
    func accessoryBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}

// MARK: - Widget

struct ClubsideWidget: Widget {
    let kind = "ClubsideWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ClubProvider()) { entry in
            ClubWidgetView(entry: entry)
        }
        .configurationDisplayName("Your clubs")
        .description("Live scores, next matches and results for the clubs you follow.")
        .supportedFamilies(supportedFamilies)
    }

    private var supportedFamilies: [WidgetFamily] {
        if #available(iOSApplicationExtension 16.0, *) {
            return [.systemSmall, .systemMedium, .accessoryRectangular]
        }
        return [.systemSmall, .systemMedium]
    }
}

@main
struct ClubsideWidgetBundle: WidgetBundle {
    var body: some Widget {
        ClubsideWidget()
    }
}

// MARK: - Preview data

enum WidgetPreview {
    static let club = WidgetClub(
        id: "ajax",
        name: "Ajax",
        shortName: "Ajax",
        color: "#D2122E",
        crest: nil,
        live: nil,
        next: WidgetMatch(
            id: "0",
            utcDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(26 * 3600)),
            status: "TIMED",
            minute: nil,
            competition: "Eredivisie",
            home: WidgetTeam(name: "Ajax", shortName: "Ajax", crest: nil),
            away: WidgetTeam(name: "PSV", shortName: "PSV", crest: nil),
            homeScore: nil,
            awayScore: nil
        ),
        last: nil
    )
}
