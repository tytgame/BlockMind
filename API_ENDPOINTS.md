# BlockMind API 엔드포인트 목록


| 엔드포인트                         | 메서드      | 기능                                     |
| ----------------------------- | -------- | -------------------------------------- |
| `/api/chat`                   | POST     | Gemini 스트리밍 응답                         |
| `/api/blocks`                 | GET      | 블록 목록 조회 (파일 블록에 signedUrl 포함)         |
| `/api/blocks`                 | POST     | 블록 생성                                  |
| `/api/blocks/[id]`            | PATCH    | 블록 수정                                  |
| `/api/blocks/[id]`            | DELETE   | 블록 삭제                                  |
| `/api/blocks/[id]/refresh`    | PATCH    | 만료된 PDF 블록 Gemini 재업로드                 |
| `/api/blocks/extract`         | POST     | 블록 자동 추출 (generateObject)              |
| `/api/blocks/reorder`         | PATCH    | 재정렬 일괄 업데이트                            |
| `/api/sessions`               | GET      | 세션 목록                                  |
| `/api/sessions`               | POST     | 세션 생성                                  |
| `/api/sessions/[id]`          | GET      | 세션 메시지 로드                              |
| `/api/sessions/[id]`          | PATCH    | 제목 수정                                  |
| `/api/sessions/[id]`          | DELETE   | 세션 삭제 (Storage + 연결 블록 연쇄 삭제)          |
| `/api/sessions/[id]/messages` | POST     | 메시지 저장                                 |
| `/api/files/upload-url`       | POST     | Supabase presigned 업로드 URL 발급          |
| `/api/files/download`         | GET      | Supabase Storage 파일 다운로드               |
| `/api/upload/gemini`          | POST     | Gemini Files API 파일 등록                 |
| `/api/upload/extract-text`    | POST     | DOCX 텍스트 추출                            |
| `/api/auth/send-otp`          | POST     | OTP 이메일 발송 (Resend)                    |
| `/api/auth/[...nextauth]`     | GET/POST | NextAuth 핸들러 (로그인, 로그아웃, OAuth 콜백, 세션) |


