function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  // Nếu sheet chỉ có header, tự động thêm tài khoản mặc định
  if (data.length <= 1) {
    sheet.appendRow(['visionx', 'admin123', 0, 9999999999999]);
    data = sheet.getDataRange().getValues();
  }
  var accounts = [];
  for (var i = 1; i < data.length; i++) {
    accounts.push({
      username: data[i][0],
      password: data[i][1],
      active: Number(data[i][2]),
      revoke: Number(data[i][3])
    });
  }
  return ContentService.createTextOutput(JSON.stringify(accounts)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = JSON.parse(e.postData.contents);
  if (!params.username || !params.password || !params.active || !params.revoke) {
    return ContentService.createTextOutput(JSON.stringify({error: "Thiếu thông tin"})).setMimeType(ContentService.MimeType.JSON);
  }
  sheet.appendRow([params.username, params.password, params.active, params.revoke]);
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function doDelete(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = JSON.parse(e.postData.contents);
  var username = params.username;
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({error: "Thiếu username"})).setMimeType(ContentService.MimeType.JSON);
  }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({error: "Không tìm thấy tài khoản"})).setMimeType(ContentService.MimeType.JSON);
}
