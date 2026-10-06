Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
bat = fso.GetParentFolderName(WScript.ScriptFullName) & "\POKA.bat"
If Not fso.FileExists(bat) Then
  MsgBox "POKA.bat 을 같은 폴더에 두세요. 파일만 따로 받으면 사이트가 열리지 않습니다.", 16, "POKA"
  WScript.Quit 1
End If
WshShell.Run """" & bat & """", 1, False
