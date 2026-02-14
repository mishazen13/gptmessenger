#ifdef _WIN32

#include <dwmapi.h>
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#include <string>

#pragma comment(lib, "dwmapi.lib")

namespace {
HWND g_user_edit = nullptr;
HWND g_pass_edit = nullptr;
HWND g_peer_edit = nullptr;
HWND g_msg_edit = nullptr;
HWND g_log_box = nullptr;
SOCKET g_sock = INVALID_SOCKET;

constexpr int IDC_USER = 1001;
constexpr int IDC_PASS = 1002;
constexpr int IDC_PEER = 1003;
constexpr int IDC_MSG = 1004;
constexpr int IDC_LOG = 1005;
constexpr int IDC_REGISTER = 2001;
constexpr int IDC_LOGIN = 2002;
constexpr int IDC_ADD_FRIEND = 2003;
constexpr int IDC_SEND_DM = 2004;

std::string to_utf8(const std::wstring &w) {
    if (w.empty()) return {};
    int n = WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, nullptr, 0, nullptr, nullptr);
    std::string out(n - 1, '\0');
    WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, out.data(), n, nullptr, nullptr);
    return out;
}

std::wstring from_utf8(const std::string &s) {
    if (s.empty()) return {};
    int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
    std::wstring out(n - 1, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, out.data(), n);
    return out;
}

std::wstring get_text(HWND h) {
    int len = GetWindowTextLengthW(h);
    std::wstring text(len, L'\0');
    GetWindowTextW(h, text.data(), len + 1);
    return text;
}

void append_log(const std::wstring &line) {
    int cur_len = GetWindowTextLengthW(g_log_box);
    SendMessageW(g_log_box, EM_SETSEL, cur_len, cur_len);
    std::wstring row = line + L"\r\n";
    SendMessageW(g_log_box, EM_REPLACESEL, FALSE, reinterpret_cast<LPARAM>(row.c_str()));
}

bool ensure_socket() {
    if (g_sock != INVALID_SOCKET) return true;

    g_sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (g_sock == INVALID_SOCKET) {
        append_log(L"[ERR] socket() failed");
        return false;
    }

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(5555);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if (connect(g_sock, reinterpret_cast<sockaddr *>(&addr), sizeof(addr)) != 0) {
        append_log(L"[ERR] cannot connect to server 127.0.0.1:5555");
        closesocket(g_sock);
        g_sock = INVALID_SOCKET;
        return false;
    }

    append_log(L"[OK] connected to server 127.0.0.1:5555");
    return true;
}

std::string request(const std::string &cmd) {
    if (!ensure_socket()) return "ERR\tnot connected";

    std::string wire = cmd + "\n";
    if (send(g_sock, wire.c_str(), static_cast<int>(wire.size()), 0) <= 0) {
        return "ERR\tsend failed";
    }

    std::string resp;
    char buf[1024];
    while (true) {
        int n = recv(g_sock, buf, sizeof(buf), 0);
        if (n <= 0) return "ERR\trecv failed";
        resp.append(buf, buf + n);
        auto p = resp.find('\n');
        if (p != std::string::npos) {
            resp.resize(p);
            return resp;
        }
    }
}

void enable_blur(HWND hwnd) {
    const DWORD backdrop = 2; // DWMSBT_MAINWINDOW (Win11)
    DwmSetWindowAttribute(hwnd, 38, &backdrop, sizeof(backdrop));

    DWM_BLURBEHIND bb{};
    bb.dwFlags = DWM_BB_ENABLE;
    bb.fEnable = TRUE;
    DwmEnableBlurBehindWindow(hwnd, &bb);
}

LRESULT CALLBACK wnd_proc(HWND hwnd, UINT msg, WPARAM wparam, LPARAM lparam) {
    switch (msg) {
    case WM_CREATE: {
        enable_blur(hwnd);

        CreateWindowW(L"STATIC", L"User", WS_VISIBLE | WS_CHILD, 20, 20, 90, 24, hwnd, nullptr, nullptr, nullptr);
        g_user_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 110, 18, 220, 26, hwnd,
                                      reinterpret_cast<HMENU>(IDC_USER), nullptr, nullptr);

        CreateWindowW(L"STATIC", L"Password", WS_VISIBLE | WS_CHILD, 350, 20, 90, 24, hwnd, nullptr, nullptr, nullptr);
        g_pass_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_PASSWORD | ES_AUTOHSCROLL, 440, 18, 220, 26,
                                      hwnd, reinterpret_cast<HMENU>(IDC_PASS), nullptr, nullptr);

        CreateWindowW(L"BUTTON", L"Register", WS_VISIBLE | WS_CHILD, 680, 16, 110, 30, hwnd, reinterpret_cast<HMENU>(IDC_REGISTER), nullptr,
                      nullptr);
        CreateWindowW(L"BUTTON", L"Login", WS_VISIBLE | WS_CHILD, 800, 16, 110, 30, hwnd, reinterpret_cast<HMENU>(IDC_LOGIN), nullptr, nullptr);

        CreateWindowW(L"STATIC", L"Peer", WS_VISIBLE | WS_CHILD, 20, 62, 90, 24, hwnd, nullptr, nullptr, nullptr);
        g_peer_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 110, 60, 220, 26, hwnd,
                                      reinterpret_cast<HMENU>(IDC_PEER), nullptr, nullptr);

        CreateWindowW(L"BUTTON", L"Add Friend", WS_VISIBLE | WS_CHILD, 350, 58, 140, 30, hwnd, reinterpret_cast<HMENU>(IDC_ADD_FRIEND), nullptr,
                      nullptr);

        g_msg_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 20, 100, 770, 28, hwnd,
                                     reinterpret_cast<HMENU>(IDC_MSG), nullptr, nullptr);
        CreateWindowW(L"BUTTON", L"Send DM", WS_VISIBLE | WS_CHILD, 800, 100, 110, 30, hwnd, reinterpret_cast<HMENU>(IDC_SEND_DM), nullptr,
                      nullptr);

        g_log_box = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_MULTILINE | ES_AUTOVSCROLL | ES_READONLY | WS_VSCROLL,
                                    20, 145, 890, 460, hwnd, reinterpret_cast<HMENU>(IDC_LOG), nullptr, nullptr);

        append_log(L"Liquid Glass Messenger Desktop (Windows)");
        append_log(L"Start server first: gptmessenger_server 5555");
        return 0;
    }
    case WM_COMMAND: {
        int id = LOWORD(wparam);
        std::wstring user = get_text(g_user_edit);
        std::wstring pass = get_text(g_pass_edit);
        std::wstring peer = get_text(g_peer_edit);
        std::wstring msg_text = get_text(g_msg_edit);

        if (id == IDC_REGISTER) {
            auto resp = request("REGISTER\t" + to_utf8(user) + "\t" + to_utf8(pass));
            append_log(L"REGISTER => " + from_utf8(resp));
        } else if (id == IDC_LOGIN) {
            auto resp = request("LOGIN\t" + to_utf8(user) + "\t" + to_utf8(pass));
            append_log(L"LOGIN => " + from_utf8(resp));
        } else if (id == IDC_ADD_FRIEND) {
            auto resp = request("ADD_FRIEND\t" + to_utf8(user) + "\t" + to_utf8(peer));
            append_log(L"ADD_FRIEND => " + from_utf8(resp));
        } else if (id == IDC_SEND_DM) {
            auto resp = request("SEND_DM\t" + to_utf8(user) + "\t" + to_utf8(peer) + "\t" + to_utf8(msg_text));
            append_log(L"SEND_DM => " + from_utf8(resp));
            auto dm = request("GET_DM\t" + to_utf8(user) + "\t" + to_utf8(peer));
            append_log(L"GET_DM => " + from_utf8(dm));
        }
        return 0;
    }
    case WM_CTLCOLORSTATIC:
    case WM_CTLCOLOREDIT: {
        HDC hdc = reinterpret_cast<HDC>(wparam);
        SetBkMode(hdc, TRANSPARENT);
        SetTextColor(hdc, RGB(240, 248, 255));
        static HBRUSH brush = CreateSolidBrush(RGB(36, 40, 56));
        return reinterpret_cast<INT_PTR>(brush);
    }
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);
        HBRUSH bg = CreateSolidBrush(RGB(36, 40, 56));
        FillRect(hdc, &rc, bg);
        DeleteObject(bg);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_DESTROY:
        if (g_sock != INVALID_SOCKET) {
            closesocket(g_sock);
            g_sock = INVALID_SOCKET;
        }
        PostQuitMessage(0);
        return 0;
    default:
        return DefWindowProcW(hwnd, msg, wparam, lparam);
    }
}
} // namespace

int WINAPI wWinMain(HINSTANCE hinstance, HINSTANCE, PWSTR, int ncmdshow) {
    WSADATA wsa_data{};
    if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) {
        return 1;
    }

    const wchar_t *kClass = L"GPTMessengerDesktopClass";
    WNDCLASSW wc{};
    wc.lpfnWndProc = wnd_proc;
    wc.hInstance = hinstance;
    wc.lpszClassName = kClass;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
    RegisterClassW(&wc);

    HWND hwnd = CreateWindowExW(WS_EX_APPWINDOW, kClass, L"GPT Messenger Desktop (Liquid Glass)",
                                WS_OVERLAPPEDWINDOW | WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT, 960, 680, nullptr, nullptr, hinstance, nullptr);
    if (!hwnd) {
        WSACleanup();
        return 1;
    }

    ShowWindow(hwnd, ncmdshow);
    UpdateWindow(hwnd);

    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    WSACleanup();
    return 0;
}

#else
int main() { return 0; }
#endif
