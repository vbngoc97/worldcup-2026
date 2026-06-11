// Time utilities to handle Vietnam timezone (Asia/Ho_Chi_Minh)
const TIMEZONE = 'Asia/Ho_Chi_Minh';

export function formatVietnamTime(utcDateStr) {
  if (!utcDateStr) return '';
  const date = new Date(utcDateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE
  }).format(date);
}

export function formatVietnamDate(utcDateStr) {
  if (!utcDateStr) return '';
  const date = new Date(utcDateStr);
  const options = {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE
  };
  // Returns format like "thứ sáu, 12/06/2026"
  let formatted = new Intl.DateTimeFormat('vi-VN', options).format(date);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function isTodayVietnam(utcDateStr) {
  if (!utcDateStr) return false;
  const matchDate = new Date(utcDateStr);
  const now = new Date();
  
  const matchViDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(matchDate); // YYYY-MM-DD
  const nowViDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
  
  return matchViDate === nowViDate;
}

export function getStatusText(status) {
  const statusMap = {
    'SCHEDULED': 'Sắp diễn ra',
    'TIMED': 'Sắp diễn ra',
    'IN_PLAY': 'Đang đá',
    'PAUSED': 'Nghỉ giữa hiệp',
    'FINISHED': 'Kết thúc',
    'POSTPONED': 'Hoãn',
    'CANCELLED': 'Hủy',
    'SUSPENDED': 'Tạm dừng',
    'AWARDED': 'Xử thắng'
  };
  return statusMap[status] || status;
}
