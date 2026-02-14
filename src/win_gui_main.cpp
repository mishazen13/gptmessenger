#ifdef _WIN32

#include <dwmapi.h>
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#include <sstream>
#include <string>
#include <vector>

#pragma comment(lib, "dwmapi.lib")

namespace {
SOCKET g_sock = INVALID_SOCKET;

HWND g_user_edit = nullptr;
HWND g_pass_edit = nullptr;
HWND g_login_btn = nullptr;
HWND g_register_btn = nullptr;
HWND g_logout_btn = nullptr;

HWND g_friend_edit = nullptr;
HWND g_add_friend_btn = nullptr;
HWND g_group_name_edit = nullptr;
HWND g_group_members_edit = nullptr;
HWND g_create_group_btn = nullptr;
HWND g_chat_list = nullptr;

HWND g_chat_title = nullptr;
HWND g_messages_box = nullptr;
HWND g_msg_edit = nullptr;
HWND g_send_btn = nullptr;

std::wstring g_current_user;
std::wstring g_current_chat;
bool g_current_is_group = false;
std::vector<std::wstring> g_dm_chats;
std::vector<std::wstring> g_group_chats;

constexpr int IDC_USER = 1001;
constexpr int IDC_PASS = 1002;
constexpr int IDC_LOGIN = 1003;
constexpr int IDC_REGISTER = 1004;
constexpr int IDC_LOGOUT = 1005;

constexpr int IDC_FRIEND = 1101;
constexpr int IDC_ADD_FRIEND = 1102;
constexpr int IDC_GROUP_NAME = 1103;
constexpr int IDC_GROUP_MEMBERS = 1104;
constexpr int IDC_CREATE_GROUP = 1105;
constexpr int IDC_CHAT_LIST = 1106;

constexpr int IDC_CHAT_TITLE = 1201;
constexpr int IDC_MESSAGES = 1202;
constexpr int IDC_MSG = 1203;
constexpr int IDC_SEND = 1204;

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

void set_text(HWND h, const std::wstring &value) { SetWindowTextW(h, value.c_str()); }

std::vector<std::wstring> split(const std::wstring &s, wchar_t delim) {
    std::vector<std::wstring> out;
    std::wstringstream ss(s);
    std::wstring item;
    while (std::getline(ss, item, delim)) {
        if (!item.empty()) out.push_back(item);
    }
    return out;
}

void set_logged_in(bool on) {
    EnableWindow(g_friend_edit, on);
    EnableWindow(g_add_friend_btn, on);
    EnableWindow(g_group_name_edit, on);
    EnableWindow(g_group_members_edit, on);
    EnableWindow(g_create_group_btn, on);
    EnableWindow(g_chat_list, on);
    EnableWindow(g_msg_edit, on);
    EnableWindow(g_send_btn, on);
    EnableWindow(g_logout_btn, on);
}

bool ensure_socket() {
    if (g_sock != INVALID_SOCKET) return true;

    g_sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (g_sock == INVALID_SOCKET) return false;

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(5555);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if (connect(g_sock, reinterpret_cast<sockaddr *>(&addr), sizeof(addr)) != 0) {
        closesocket(g_sock);
        g_sock = INVALID_SOCKET;
        return false;
    }
    return true;
}

std::string request(const std::string &cmd) {
    if (!ensure_socket()) return "ERR\tNot connected to server";

    std::string wire = cmd + "\n";
    if (send(g_sock, wire.c_str(), static_cast<int>(wire.size()), 0) <= 0) return "ERR\tsend failed";

    std::string resp;
    char buf[2048];
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

void show_error(const std::wstring &msg) { MessageBoxW(nullptr, msg.c_str(), L"Ошибка", MB_ICONERROR | MB_OK); }
void show_info(const std::wstring &msg) { MessageBoxW(nullptr, msg.c_str(), L"GPT Messenger", MB_OK | MB_ICONINFORMATION); }

bool ok_response(const std::string &resp) { return resp.rfind("OK\t", 0) == 0; }

void push_chat_item(const std::wstring &label, bool is_group) {
    std::wstring item = (is_group ? L"👥 " : L"👤 ") + label;
    SendMessageW(g_chat_list, LB_ADDSTRING, 0, reinterpret_cast<LPARAM>(item.c_str()));
}

void rebuild_chat_list() {
    SendMessageW(g_chat_list, LB_RESETCONTENT, 0, 0);
    for (const auto &d : g_dm_chats) push_chat_item(d, false);
    for (const auto &g : g_group_chats) push_chat_item(g, true);
}

void set_chat_title() {
    if (g_current_chat.empty()) {
        set_text(g_chat_title, L"Выберите чат");
    } else if (g_current_is_group) {
        set_text(g_chat_title, L"Группа: " + g_current_chat);
    } else {
        set_text(g_chat_title, L"Диалог: " + g_current_chat);
    }
}

std::wstring pretty_payload(const std::string &payload) {
    if (payload.empty()) return L"";
    std::wstring w = from_utf8(payload);
    for (auto &ch : w) {
        if (ch == L';') ch = L'\n';
    }
    return w;
}

void refresh_messages() {
    if (g_current_chat.empty() || g_current_user.empty()) {
        set_text(g_messages_box, L"Выберите чат слева");
        return;
    }

    std::string resp;
    if (g_current_is_group) {
        resp = request("GET_GROUP\t" + to_utf8(g_current_chat));
    } else {
        resp = request("GET_DM\t" + to_utf8(g_current_user) + "\t" + to_utf8(g_current_chat));
    }

    if (!ok_response(resp)) {
        set_text(g_messages_box, L"Не удалось загрузить сообщения");
        return;
    }

    std::size_t tab = resp.find('\t');
    std::string body = (tab == std::string::npos) ? "" : resp.substr(tab + 1);
    std::wstring view = pretty_payload(body);
    if (view.empty()) view = L"Пока нет сообщений";
    set_text(g_messages_box, view);
}

void try_login(bool is_register) {
    auto user = get_text(g_user_edit);
    auto pass = get_text(g_pass_edit);
    if (user.empty() || pass.empty()) {
        show_error(L"Введите логин и пароль");
        return;
    }

    std::string cmd = (is_register ? "REGISTER\t" : "LOGIN\t") + to_utf8(user) + "\t" + to_utf8(pass);
    auto resp = request(cmd);
    if (!ok_response(resp)) {
        show_error(L"Ошибка: " + from_utf8(resp));
        return;
    }

    g_current_user = user;
    g_dm_chats.clear();
    g_group_chats.clear();
    rebuild_chat_list();
    set_logged_in(true);
    show_info(is_register ? L"Регистрация успешна" : L"Вход выполнен");
}

void do_logout() {
    g_current_user.clear();
    g_current_chat.clear();
    g_current_is_group = false;
    g_dm_chats.clear();
    g_group_chats.clear();
    rebuild_chat_list();
    set_chat_title();
    set_text(g_messages_box, L"Войдите, чтобы начать общение");
    set_logged_in(false);
}

void add_friend() {
    if (g_current_user.empty()) return;
    auto peer = get_text(g_friend_edit);
    if (peer.empty()) return;
    auto resp = request("ADD_FRIEND\t" + to_utf8(g_current_user) + "\t" + to_utf8(peer));
    if (!ok_response(resp)) {
        show_error(from_utf8(resp));
        return;
    }
    g_dm_chats.push_back(peer);
    rebuild_chat_list();
    show_info(L"Друг добавлен");
}

void create_group() {
    if (g_current_user.empty()) return;
    auto group = get_text(g_group_name_edit);
    if (group.empty()) return;

    auto resp = request("CREATE_GROUP\t" + to_utf8(g_current_user) + "\t" + to_utf8(group));
    if (!ok_response(resp)) {
        show_error(from_utf8(resp));
        return;
    }

    for (const auto &m : split(get_text(g_group_members_edit), L',')) {
        request("JOIN_GROUP\t" + to_utf8(m) + "\t" + to_utf8(group));
    }

    g_group_chats.push_back(group);
    rebuild_chat_list();
    show_info(L"Группа создана");
}

void send_message() {
    if (g_current_user.empty() || g_current_chat.empty()) return;
    auto text = get_text(g_msg_edit);
    if (text.empty()) return;

    std::string resp;
    if (g_current_is_group) {
        resp = request("SEND_GROUP\t" + to_utf8(g_current_user) + "\t" + to_utf8(g_current_chat) + "\t" + to_utf8(text));
    } else {
        resp = request("SEND_DM\t" + to_utf8(g_current_user) + "\t" + to_utf8(g_current_chat) + "\t" + to_utf8(text));
    }
    if (!ok_response(resp)) {
        show_error(from_utf8(resp));
        return;
    }
    set_text(g_msg_edit, L"");
    refresh_messages();
}

void enable_blur(HWND hwnd) {
    const DWORD backdrop = 2;
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

        HFONT font = CreateFontW(20, 0, 0, 0, FW_MEDIUM, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                                 CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, L"Segoe UI");

        g_user_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"alice", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 24, 24, 180, 30, hwnd,
                                      reinterpret_cast<HMENU>(IDC_USER), nullptr, nullptr);
        g_pass_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"123", WS_VISIBLE | WS_CHILD | ES_PASSWORD | ES_AUTOHSCROLL, 214, 24, 120, 30,
                                      hwnd, reinterpret_cast<HMENU>(IDC_PASS), nullptr, nullptr);
        g_login_btn = CreateWindowW(L"BUTTON", L"Войти", WS_VISIBLE | WS_CHILD, 24, 64, 150, 34, hwnd, reinterpret_cast<HMENU>(IDC_LOGIN), nullptr,
                                    nullptr);
        g_register_btn = CreateWindowW(L"BUTTON", L"Регистрация", WS_VISIBLE | WS_CHILD, 184, 64, 150, 34, hwnd,
                                       reinterpret_cast<HMENU>(IDC_REGISTER), nullptr, nullptr);
        g_logout_btn = CreateWindowW(L"BUTTON", L"Выйти", WS_VISIBLE | WS_CHILD, 24, 108, 310, 34, hwnd, reinterpret_cast<HMENU>(IDC_LOGOUT), nullptr,
                                     nullptr);

        g_friend_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"Логин друга", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 24, 172, 240, 32, hwnd,
                                        reinterpret_cast<HMENU>(IDC_FRIEND), nullptr, nullptr);
        g_add_friend_btn = CreateWindowW(L"BUTTON", L"+", WS_VISIBLE | WS_CHILD, 274, 172, 60, 32, hwnd,
                                         reinterpret_cast<HMENU>(IDC_ADD_FRIEND), nullptr, nullptr);

        g_group_name_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"Название группы", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 24, 220, 310, 32,
                                            hwnd, reinterpret_cast<HMENU>(IDC_GROUP_NAME), nullptr, nullptr);
        g_group_members_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"Участники через запятую", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 24,
                                               260, 310, 32, hwnd, reinterpret_cast<HMENU>(IDC_GROUP_MEMBERS), nullptr, nullptr);
        g_create_group_btn = CreateWindowW(L"BUTTON", L"Создать группу", WS_VISIBLE | WS_CHILD, 24, 300, 310, 34, hwnd,
                                           reinterpret_cast<HMENU>(IDC_CREATE_GROUP), nullptr, nullptr);

        g_chat_list = CreateWindowExW(WS_EX_CLIENTEDGE, L"LISTBOX", L"", WS_VISIBLE | WS_CHILD | LBS_NOTIFY | WS_VSCROLL, 24, 350, 310, 280, hwnd,
                                      reinterpret_cast<HMENU>(IDC_CHAT_LIST), nullptr, nullptr);

        g_chat_title = CreateWindowW(L"STATIC", L"Выберите чат", WS_VISIBLE | WS_CHILD, 370, 24, 720, 40, hwnd,
                                     reinterpret_cast<HMENU>(IDC_CHAT_TITLE), nullptr, nullptr);
        g_messages_box = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"Войдите, чтобы начать общение", WS_VISIBLE | WS_CHILD | ES_MULTILINE |
                                                                          ES_AUTOVSCROLL | ES_READONLY | WS_VSCROLL,
                                         370, 74, 720, 486, hwnd, reinterpret_cast<HMENU>(IDC_MESSAGES), nullptr, nullptr);
        g_msg_edit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, 370, 572, 720, 32, hwnd,
                                     reinterpret_cast<HMENU>(IDC_MSG), nullptr, nullptr);
        g_send_btn = CreateWindowW(L"BUTTON", L"Отправить", WS_VISIBLE | WS_CHILD, 370, 612, 720, 34, hwnd, reinterpret_cast<HMENU>(IDC_SEND), nullptr,
                                   nullptr);

        for (HWND h : {g_user_edit, g_pass_edit, g_login_btn, g_register_btn, g_logout_btn, g_friend_edit, g_add_friend_btn, g_group_name_edit,
                       g_group_members_edit, g_create_group_btn, g_chat_list, g_chat_title, g_messages_box, g_msg_edit, g_send_btn}) {
            SendMessageW(h, WM_SETFONT, reinterpret_cast<WPARAM>(font), TRUE);
        }

        set_logged_in(false);
        set_chat_title();
        return 0;
    }
    case WM_COMMAND: {
        const int id = LOWORD(wparam);
        if (id == IDC_LOGIN)
            try_login(false);
        else if (id == IDC_REGISTER)
            try_login(true);
        else if (id == IDC_LOGOUT)
            do_logout();
        else if (id == IDC_ADD_FRIEND)
            add_friend();
        else if (id == IDC_CREATE_GROUP)
            create_group();
        else if (id == IDC_SEND)
            send_message();
        else if (id == IDC_CHAT_LIST && HIWORD(wparam) == LBN_SELCHANGE) {
            int idx = static_cast<int>(SendMessageW(g_chat_list, LB_GETCURSEL, 0, 0));
            if (idx != LB_ERR) {
                wchar_t buf[512];
                SendMessageW(g_chat_list, LB_GETTEXT, idx, reinterpret_cast<LPARAM>(buf));
                std::wstring full = buf;
                if (full.rfind(L"👥 ", 0) == 0) {
                    g_current_is_group = true;
                    g_current_chat = full.substr(3);
                } else if (full.rfind(L"👤 ", 0) == 0) {
                    g_current_is_group = false;
                    g_current_chat = full.substr(3);
                }
                set_chat_title();
                refresh_messages();
            }
        }
        return 0;
    }
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);

        HBRUSH bg = CreateSolidBrush(RGB(8, 18, 44));
        FillRect(hdc, &rc, bg);
        DeleteObject(bg);

        RECT sidebar{12, 12, 350, rc.bottom - 12};
        HBRUSH sb = CreateSolidBrush(RGB(52, 91, 215));
        FillRect(hdc, &sidebar, sb);
        DeleteObject(sb);

        RECT mainpanel{360, 12, rc.right - 12, rc.bottom - 12};
        HBRUSH mp = CreateSolidBrush(RGB(44, 56, 96));
        FillRect(hdc, &mainpanel, mp);
        DeleteObject(mp);

        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_CTLCOLORSTATIC:
    case WM_CTLCOLOREDIT:
    case WM_CTLCOLORLISTBOX: {
        HDC hdc = reinterpret_cast<HDC>(wparam);
        SetBkMode(hdc, TRANSPARENT);
        SetTextColor(hdc, RGB(236, 242, 255));
        static HBRUSH brush = CreateSolidBrush(RGB(58, 74, 120));
        return reinterpret_cast<INT_PTR>(brush);
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

int run_gui(HINSTANCE hinstance, int ncmdshow) {
    WSADATA wsa_data{};
    if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) return 1;

    const wchar_t *kClass = L"GPTMessengerDesktopClass";
    WNDCLASSW wc{};
    wc.lpfnWndProc = wnd_proc;
    wc.hInstance = hinstance;
    wc.lpszClassName = kClass;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
    RegisterClassW(&wc);

    HWND hwnd = CreateWindowExW(WS_EX_APPWINDOW, kClass, L"GPT Messenger Desktop", WS_OVERLAPPEDWINDOW | WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT,
                                1120, 700, nullptr, nullptr, hinstance, nullptr);
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

int WINAPI wWinMain(HINSTANCE hinstance, HINSTANCE, PWSTR, int ncmdshow) { return run_gui(hinstance, ncmdshow); }
int WINAPI WinMain(HINSTANCE hinstance, HINSTANCE, LPSTR, int ncmdshow) { return run_gui(hinstance, ncmdshow); }


#else
int main() { return 0; }
#endif
