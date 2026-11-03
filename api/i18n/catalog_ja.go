package i18n

var jaMessages = map[Key]string{
	MsgInvalidID:      "無効なIDです",
	MsgInternal:       "問題が発生しました",
	MsgInvalidRequest: "リクエストの内容が正しくありません",
	MsgNotFound:       "見つかりませんでした",
	MsgConflict:       "既存のデータと競合しています",

	MsgAuthInvalidBody:         "リクエストの内容が正しくありません",
	MsgAuthInvalidCredentials:  "メールアドレスまたはパスワードが正しくありません",
	MsgAuthTokenFailed:         "トークンを発行できませんでした",
	MsgAuthLoginSuccess:        "ログインしました",
	MsgAuthRegisterInvalid:     "リクエストの内容が正しくありません",
	MsgAuthHashFailed:          "パスワードの暗号化に失敗しました",
	MsgAuthCreateFailed:        "ユーザーの作成に失敗しました",
	MsgAuthRegisterTokenFailed: "トークンの発行に失敗しました",
	MsgAuthRegistered:          "登録が完了しました",
	MsgAuthRefreshNotFound:     "リフレッシュトークンが見つかりません",
	MsgAuthRefreshMalformed:    "Authorization ヘッダーの形式が正しくありません",
	MsgAuthRefreshInvalid:      "リフレッシュトークンが無効です",
	MsgAuthRefreshFailed:       "トークンの発行に失敗しました",
	MsgAuthEmailTaken:          "このメールアドレスは既に登録されています",
	MsgAuthRefreshed:           "トークンを更新しました",
	MsgAuthNotAuthenticated:    "ログインが必要です",
	MsgAuthHeaderNotFound:      "Authorization ヘッダーが見つかりません",
	MsgAuthInvalidAccessToken:  "アクセストークンが無効です",

	MsgUserCreated:  "ユーザーを作成しました",
	MsgUserUpdated:  "ユーザー情報を更新しました",
	MsgUserDeleted:  "ユーザーを削除しました",
	MsgUserNotFound: "ユーザーが見つかりません",
}
