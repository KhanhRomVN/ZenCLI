/**
 * Message constants for ZenCLI
 */

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: "Đăng nhập thành công!",
  LOGOUT_SUCCESS: "Đăng xuất thành công!",
  ACCOUNT_ADDED: "Tài khoản đã được thêm thành công!",
  ACCOUNT_SWITCHED: "Đã chuyển sang tài khoản mới!",
  ACCOUNT_REMOVED: "Tài khoản đã được xóa!",

  // Chat
  CHAT_STARTED: "Bắt đầu trò chuyện!",
  MESSAGE_SENT: "Tin nhắn đã được gửi!",
  CONVERSATION_CREATED: "Cuộc trò chuyện mới đã được tạo!",
  CONVERSATION_CLEARED: "Đã xóa lịch sử trò chuyện!",

  // Settings
  SETTINGS_SAVED: "Cài đặt đã được lưu!",
  MODEL_CHANGED: "Mô hình đã được thay đổi!",
  THEME_CHANGED: "Giao diện đã được thay đổi!",

  // Server
  SERVER_STARTED: "Máy chủ đã khởi động!",
  SERVER_STOPPED: "Máy chủ đã dừng!",

  // File operations
  FILE_UPLOADED: "Tệp đã được tải lên!",
  FILE_DOWNLOADED: "Tệp đã được tải xuống!",
  FILE_DELETED: "Tệp đã được xóa!",

  // Export/Import
  EXPORT_SUCCESS: "Xuất dữ liệu thành công!",
  IMPORT_SUCCESS: "Nhập dữ liệu thành công!",
  BACKUP_CREATED: "Sao lưu đã được tạo!",
  BACKUP_RESTORED: "Đã khôi phục từ bản sao lưu!",

  // General
  OPERATION_COMPLETED: "Thao tác hoàn tất!",
  CHANGES_SAVED: "Thay đổi đã được lưu!",
  UPDATED_SUCCESSFULLY: "Cập nhật thành công!",
  DELETED_SUCCESSFULLY: "Xóa thành công!",
  CREATED_SUCCESSFULLY: "Tạo thành công!",
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH_FAILED: "Xác thực thất bại!",
  LOGIN_FAILED: "Đăng nhập thất bại!",
  SESSION_EXPIRED: "Phiên làm việc đã hết hạn!",
  INVALID_CREDENTIALS: "Thông tin đăng nhập không hợp lệ!",
  ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản!",
  ACCOUNT_ALREADY_EXISTS: "Tài khoản đã tồn tại!",

  // Network errors
  NETWORK_ERROR: "Lỗi kết nối mạng!",
  CONNECTION_TIMEOUT: "Kết nối quá thời gian chờ!",
  SERVER_ERROR: "Lỗi máy chủ!",
  API_ERROR: "Lỗi API!",
  RATE_LIMITED: "Đã vượt quá giới hạn yêu cầu!",

  // Chat errors
  CHAT_FAILED: "Gửi tin nhắn thất bại!",
  CONVERSATION_NOT_FOUND: "Không tìm thấy cuộc trò chuyện!",
  MESSAGE_TOO_LONG: "Tin nhắn quá dài!",
  INVALID_MESSAGE: "Tin nhắn không hợp lệ!",

  // File errors
  FILE_TOO_LARGE: "Tệp quá lớn!",
  INVALID_FILE_TYPE: "Loại tệp không hợp lệ!",
  FILE_NOT_FOUND: "Không tìm thấy tệp!",
  UPLOAD_FAILED: "Tải lên thất bại!",
  DOWNLOAD_FAILED: "Tải xuống thất bại!",

  // Validation errors
  VALIDATION_ERROR: "Lỗi xác thực dữ liệu!",
  REQUIRED_FIELD: "Trường này là bắt buộc!",
  INVALID_EMAIL: "Email không hợp lệ!",
  INVALID_PHONE: "Số điện thoại không hợp lệ!",
  INVALID_URL: "URL không hợp lệ!",
  INVALID_DATE: "Ngày không hợp lệ!",
  INVALID_NUMBER: "Số không hợp lệ!",
  PASSWORD_TOO_WEAK: "Mật khẩu quá yếu!",
  PASSWORDS_DONT_MATCH: "Mật khẩu không khớp!",

  // System errors
  INTERNAL_ERROR: "Lỗi hệ thống!",
  NOT_IMPLEMENTED: "Chức năng chưa được triển khai!",
  PERMISSION_DENIED: "Không có quyền truy cập!",
  RESOURCE_NOT_FOUND: "Không tìm thấy tài nguyên!",
  OPERATION_NOT_ALLOWED: "Thao tác không được phép!",
  OUT_OF_MEMORY: "Hết bộ nhớ!",
  DISK_FULL: "Ổ đĩa đầy!",

  // Configuration errors
  CONFIG_ERROR: "Lỗi cấu hình!",
  MISSING_CONFIG: "Thiếu cấu hình!",
  INVALID_CONFIG: "Cấu hình không hợp lệ!",

  // Database errors
  DATABASE_ERROR: "Lỗi cơ sở dữ liệu!",
  DUPLICATE_ENTRY: "Bản ghi trùng lặp!",
  CONSTRAINT_VIOLATION: "Vi phạm ràng buộc!",

  // Electron errors
  ELECTRON_NOT_FOUND: "Không tìm thấy Electron!",
  ELECTRON_FAILED: "Lỗi Electron!",
  BROWSER_NOT_FOUND: "Không tìm thấy trình duyệt!",
} as const;

/**
 * Warning messages
 */
export const WARNING_MESSAGES = {
  // Authentication warnings
  SESSION_EXPIRING_SOON: "Phiên làm việc sắp hết hạn!",
  MULTIPLE_ACCOUNTS: "Bạn có nhiều tài khoản!",
  ACCOUNT_INACTIVE: "Tài khoản không hoạt động!",

  // Chat warnings
  LONG_RESPONSE_TIME: "Thời gian phản hồi dài!",
  HIGH_TOKEN_USAGE: "Sử dụng token cao!",
  CONTEXT_WINDOW_FULL: "Cửa sổ ngữ cảnh đầy!",
  SLOW_CONNECTION: "Kết nối chậm!",

  // File warnings
  LARGE_FILE: "Tệp lớn có thể mất thời gian!",
  UNSUPPORTED_FILE_TYPE: "Loại tệp có thể không được hỗ trợ đầy đủ!",
  TEMP_FILE: "Đây là tệp tạm thời!",

  // System warnings
  LOW_DISK_SPACE: "Dung lượng ổ đĩa thấp!",
  HIGH_MEMORY_USAGE: "Sử dụng bộ nhớ cao!",
  OUTDATED_VERSION: "Phiên bản cũ!",
  UNSTABLE_NETWORK: "Mạng không ổn định!",

  // Security warnings
  INSECURE_CONNECTION: "Kết nối không an toàn!",
  PUBLIC_NETWORK: "Đang sử dụng mạng công cộng!",
  SENSITIVE_DATA: "Dữ liệu nhạy cảm!",

  // Performance warnings
  SLOW_PERFORMANCE: "Hiệu suất chậm!",
  HIGH_CPU_USAGE: "Sử dụng CPU cao!",
  MANY_TABS: "Nhiều tab đang mở!",

  // Configuration warnings
  DEFAULT_CONFIG: "Đang sử dụng cấu hình mặc định!",
  DEPRECATED_FEATURE: "Tính năng đã lỗi thời!",
  EXPERIMENTAL_FEATURE: "Tính năng thử nghiệm!",

  // Export/Import warnings
  LARGE_EXPORT: "Xuất dữ liệu lớn!",
  INCOMPATIBLE_VERSION: "Phiên bản không tương thích!",
  PARTIAL_IMPORT: "Nhập dữ liệu một phần!",
} as const;

/**
 * Information messages
 */
export const INFO_MESSAGES = {
  // Status messages
  LOADING: "Đang tải...",
  PROCESSING: "Đang xử lý...",
  SAVING: "Đang lưu...",
  UPLOADING: "Đang tải lên...",
  DOWNLOADING: "Đang tải xuống...",
  CONNECTING: "Đang kết nối...",
  DISCONNECTING: "Đang ngắt kết nối...",

  // Progress messages
  PLEASE_WAIT: "Vui lòng chờ...",
  ALMOST_DONE: "Gần hoàn tất...",
  PROCESSING_COMPLETE: "Xử lý hoàn tất!",

  // Feature messages
  NEW_FEATURE: "Tính năng mới!",
  BETA_FEATURE: "Tính năng beta!",
  COMING_SOON: "Sắp ra mắt!",

  // Update messages
  CHECKING_UPDATES: "Đang kiểm tra cập nhật...",
  UPDATE_AVAILABLE: "Có bản cập nhật mới!",
  UPDATING: "Đang cập nhật...",
  UPDATE_COMPLETE: "Cập nhật hoàn tất!",

  // Backup messages
  BACKUP_IN_PROGRESS: "Đang sao lưu...",
  RESTORE_IN_PROGRESS: "Đang khôi phục...",
  BACKUP_COMPLETE: "Sao lưu hoàn tất!",
  RESTORE_COMPLETE: "Khôi phục hoàn tất!",

  // System messages
  SYSTEM_STARTING: "Hệ thống đang khởi động...",
  SYSTEM_SHUTTING_DOWN: "Hệ thống đang tắt...",
  MAINTENANCE_MODE: "Chế độ bảo trì!",

  // Connection messages
  RECONNECTING: "Đang kết nối lại...",
  CONNECTION_RESTORED: "Kết nối đã được khôi phục!",
  OFFLINE_MODE: "Chế độ ngoại tuyến!",
} as const;

/**
 * Prompt messages
 */
export const PROMPT_MESSAGES = {
  // Confirmation prompts
  CONFIRM_EXIT: "Bạn có chắc chắn muốn thoát?",
  CONFIRM_DELETE: "Bạn có chắc chắn muốn xóa?",
  CONFIRM_LOGOUT: "Bạn có chắc chắn muốn đăng xuất?",
  CONFIRM_OVERWRITE: "Bạn có chắc chắn muốn ghi đè?",
  CONFIRM_CANCEL: "Bạn có chắc chắn muốn hủy?",
  CONFIRM_RESET: "Bạn có chắc chắn muốn đặt lại?",

  // Input prompts
  ENTER_EMAIL: "Nhập địa chỉ email:",
  ENTER_PASSWORD: "Nhập mật khẩu:",
  ENTER_NAME: "Nhập tên:",
  ENTER_MESSAGE: "Nhập tin nhắn:",
  ENTER_SEARCH: "Nhập từ khóa tìm kiếm:",
  ENTER_URL: "Nhập URL:",
  ENTER_PHONE: "Nhập số điện thoại:",
  ENTER_DATE: "Nhập ngày:",
  ENTER_NUMBER: "Nhập số:",

  // Selection prompts
  SELECT_ACCOUNT: "Chọn tài khoản:",
  SELECT_MODEL: "Chọn mô hình:",
  SELECT_THEME: "Chọn giao diện:",
  SELECT_FILE: "Chọn tệp:",
  SELECT_FOLDER: "Chọn thư mục:",
  SELECT_OPTION: "Chọn tùy chọn:",
  SELECT_LANGUAGE: "Chọn ngôn ngữ:",

  // Action prompts
  PRESS_ANY_KEY: "Nhấn phím bất kỳ để tiếp tục...",
  PRESS_ENTER: "Nhấn Enter để tiếp tục...",
  PRESS_ESC: "Nhấn ESC để thoát...",
  CLICK_TO_CONTINUE: "Nhấp để tiếp tục...",

  // Warning prompts
  SAVE_CHANGES: "Lưu thay đổi?",
  DISCARD_CHANGES: "Hủy bỏ thay đổi?",
  CONTINUE_WITHOUT_SAVING: "Tiếp tục mà không lưu?",

  // Error prompts
  RETRY_OPERATION: "Thử lại thao tác?",
  CONTINUE_ANYWAY: "Vẫn tiếp tục?",
  REPORT_ERROR: "Báo cáo lỗi?",
} as const;

/**
 * Help messages
 */
export const HELP_MESSAGES = {
  // General help
  WELCOME: "Chào mừng đến với ZenCLI!",
  QUICK_START: "Để bắt đầu, hãy đăng nhập hoặc tạo tài khoản mới.",
  NEED_HELP: "Cần trợ giúp? Gõ 'help' hoặc '/help' để xem các lệnh có sẵn.",

  // Command help
  COMMAND_LIST: "Danh sách lệnh có sẵn:",
  COMMAND_SYNTAX: "Cú pháp:",
  COMMAND_EXAMPLES: "Ví dụ:",
  COMMAND_OPTIONS: "Tùy chọn:",

  // Feature help
  CHAT_HELP:
    "Gõ tin nhắn và nhấn Enter để gửi. Sử dụng /help để xem các lệnh chat.",
  ACCOUNT_HELP:
    "Quản lý tài khoản của bạn: thêm, xóa, hoặc chuyển đổi tài khoản.",
  SETTINGS_HELP:
    "Tùy chỉnh cài đặt: thay đổi mô hình, giao diện, và các tùy chọn khác.",
  SERVER_HELP: "Chạy máy chủ HTTP để truy cập API từ ứng dụng khác.",

  // Error help
  TROUBLESHOOTING: "Khắc phục sự cố:",
  CONTACT_SUPPORT: "Liên hệ hỗ trợ:",
  CHECK_DOCS: "Kiểm tra tài liệu:",

  // Tips
  TIP_OF_THE_DAY: "Mẹo trong ngày:",
  KEYBOARD_SHORTCUTS: "Phím tắt bàn phím:",
  PRODUCTIVITY_TIPS: "Mẹo năng suất:",

  // Updates
  NEW_IN_VERSION: "Mới trong phiên bản:",
  UPCOMING_FEATURES: "Tính năng sắp tới:",
  RELEASE_NOTES: "Ghi chú phát hành:",
} as const;

/**
 * Question messages
 */
export const QUESTION_MESSAGES = {
  // Authentication questions
  CREATE_ACCOUNT: "Bạn muốn tạo tài khoản mới?",
  LOGIN_AGAIN: "Bạn muốn đăng nhập lại?",
  REMOVE_ACCOUNT: "Bạn có chắc chắn muốn xóa tài khoản này?",

  // Chat questions
  START_NEW_CHAT: "Bắt đầu cuộc trò chuyện mới?",
  CLEAR_HISTORY: "Xóa lịch sử trò chuyện?",
  SAVE_CONVERSATION: "Lưu cuộc trò chuyện?",
  EXPORT_CONVERSATION: "Xuất cuộc trò chuyện?",

  // File questions
  OPEN_FILE: "Mở tệp?",
  SAVE_FILE: "Lưu tệp?",
  DELETE_FILE: "Xóa tệp?",
  OVERWRITE_FILE: "Ghi đè tệp?",

  // Settings questions
  CHANGE_THEME: "Thay đổi giao diện?",
  CHANGE_MODEL: "Thay đổi mô hình?",
  RESET_SETTINGS: "Đặt lại cài đặt về mặc định?",

  // Update questions
  INSTALL_UPDATE: "Cài đặt bản cập nhật?",
  RESTART_APP: "Khởi động lại ứng dụng?",
  CHECK_UPDATES: "Kiểm tra cập nhật?",

  // Backup questions
  CREATE_BACKUP: "Tạo bản sao lưu?",
  RESTORE_BACKUP: "Khôi phục từ bản sao lưu?",
  DELETE_BACKUP: "Xóa bản sao lưu?",

  // General questions
  CONTINUE: "Tiếp tục?",
  CANCEL: "Hủy bỏ?",
  CONFIRM: "Xác nhận?",
  PROCEED: "Tiến hành?",
} as const;

/**
 * Notification messages
 */
export const NOTIFICATION_MESSAGES = {
  // Success notifications
  OPERATION_SUCCESS: "Thao tác thành công!",
  TASK_COMPLETED: "Tác vụ hoàn thành!",
  UPLOAD_COMPLETE: "Tải lên hoàn tất!",
  DOWNLOAD_COMPLETE: "Tải xuống hoàn tất!",

  // Error notifications
  OPERATION_FAILED: "Thao tác thất bại!",
  TASK_FAILED: "Tác vụ thất bại!",
  UPLOAD_FAILED: "Tải lên thất bại!",
  DOWNLOAD_FAILED: "Tải xuống thất bại!",

  // Warning notifications
  ATTENTION_NEEDED: "Cần chú ý!",
  CHECK_REQUIRED: "Cần kiểm tra!",
  VERIFICATION_NEEDED: "Cần xác minh!",

  // Info notifications
  NEW_MESSAGE: "Tin nhắn mới!",
  UPDATE_AVAILABLE_NOTIF: "Có bản cập nhật!",
  BACKUP_COMPLETE_NOTIF: "Sao lưu hoàn tất!",
  TASK_STARTED: "Tác vụ đã bắt đầu!",

  // System notifications
  SYSTEM_UPDATE: "Cập nhật hệ thống!",
  MAINTENANCE_NOTICE: "Thông báo bảo trì!",
  SECURITY_ALERT: "Cảnh báo bảo mật!",
  PERFORMANCE_ALERT: "Cảnh báo hiệu suất!",
} as const;

/**
 * Format messages with variables
 */
export function formatMessage(
  message: string,
  variables: Record<string, string | number>
): string {
  let formatted = message;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{${key}}`, "g"), String(value));
  }
  return formatted;
}

/**
 * Get a random success message
 */
export function getRandomSuccessMessage(): string {
  const messages = Object.values(SUCCESS_MESSAGES);
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a random tip message
 */
export function getRandomTip(): string {
  const tips = [
    "Sử dụng phím tắt để tăng tốc độ làm việc!",
    "Bạn có thể kéo và thả tệp vào cửa sổ chat!",
    "Sử dụng /help để xem tất cả các lệnh có sẵn!",
    "Bạn có thể chuyển đổi giữa các tài khoản một cách dễ dàng!",
    "Lưu các cuộc trò chuyện quan trọng để tham khảo sau!",
    "Sử dụng tính năng tìm kiếm để nhanh chóng tìm thông tin!",
    "Tùy chỉnh giao diện theo sở thích của bạn!",
    "Kiểm tra cập nhật thường xuyên để có tính năng mới!",
    "Sử dụng tính năng sao lưu để bảo vệ dữ liệu của bạn!",
    "Báo cáo lỗi để giúp chúng tôi cải thiện ứng dụng!",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Get a welcome message based on time of day
 */
export function getTimeBasedWelcome(name?: string): string {
  const hour = new Date().getHours();
  let greeting = "Chào";

  if (hour >= 5 && hour < 12) {
    greeting = "Chào buổi sáng";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Chào buổi chiều";
  } else {
    greeting = "Chào buổi tối";
  }

  return name ? `${greeting}, ${name}!` : `${greeting}!`;
}

/**
 * Message templates for different scenarios
 */
export const MESSAGE_TEMPLATES = {
  // Error templates
  ERROR_WITH_DETAILS: "Lỗi: {error}. Chi tiết: {details}",
  ERROR_WITH_CODE: "Lỗi {code}: {message}",
  ERROR_WITH_SUGGESTION: "Lỗi: {error}. Gợi ý: {suggestion}",

  // Success templates
  SUCCESS_WITH_DETAILS: "Thành công: {action}. {details}",
  SUCCESS_WITH_COUNT: "Đã {action} {count} mục thành công!",
  SUCCESS_WITH_TIME: "Hoàn thành trong {time}!",

  // Progress templates
  PROGRESS_WITH_PERCENTAGE: "Đang {action}... {percentage}%",
  PROGRESS_WITH_COUNT: "Đang {action}... {current}/{total}",
  PROGRESS_WITH_TIME: "Đang {action}... Ước tính còn {time}",

  // Status templates
  STATUS_WITH_INFO: "Trạng thái: {status}. Thông tin: {info}",
  STATUS_WITH_METRICS: "Trạng thái: {status}. Số liệu: {metrics}",
  STATUS_WITH_UPDATES: "Trạng thái: {status}. Cập nhật: {updates}",

  // Notification templates
  NOTIFICATION_WITH_ACTION: "Thông báo: {message}. Hành động: {action}",
  NOTIFICATION_WITH_LINK: "Thông báo: {message}. Liên kết: {link}",
  NOTIFICATION_WITH_DEADLINE: "Thông báo: {message}. Hạn chót: {deadline}",
} as const;
