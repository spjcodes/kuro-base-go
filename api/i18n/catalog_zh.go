package i18n

var zhMessages = map[Key]string{
	MsgInvalidID:      "无效的 ID",
	MsgInternal:       "出了点问题",
	MsgInvalidRequest: "请求数据有误",
	MsgNotFound:       "未找到相关内容",
	MsgConflict:       "与已有数据冲突",

	MsgAuthInvalidBody:         "请求数据有误",
	MsgAuthInvalidCredentials:  "邮箱或密码不正确",
	MsgAuthTokenFailed:         "无法生成登录凭证",
	MsgAuthLoginSuccess:        "登录成功",
	MsgAuthRegisterInvalid:     "请求数据有误",
	MsgAuthHashFailed:          "密码加密失败",
	MsgAuthCreateFailed:        "创建用户失败",
	MsgAuthRegisterTokenFailed: "生成登录凭证失败",
	MsgAuthRegistered:          "注册成功",
	MsgAuthRefreshNotFound:     "未找到刷新凭证",
	MsgAuthRefreshMalformed:    "Authorization 请求头格式有误",
	MsgAuthRefreshInvalid:      "刷新凭证无效",
	MsgAuthRefreshFailed:       "生成登录凭证失败",
	MsgAuthEmailTaken:          "该邮箱已被注册",
	MsgAuthRefreshed:           "登录凭证已刷新",
	MsgAuthNotAuthenticated:    "请先登录",
	MsgAuthHeaderNotFound:      "未找到 Authorization 请求头",
	MsgAuthInvalidAccessToken:  "访问凭证无效",

	MsgUserCreated:  "用户创建成功",
	MsgUserUpdated:  "用户信息已更新",
	MsgUserDeleted:  "用户已删除",
	MsgUserNotFound: "用户不存在",
}
