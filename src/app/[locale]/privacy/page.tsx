import { Link } from '@/i18n/navigation';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-300">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <Link href="/" className="flex items-center w-fit">
          <span className="text-xl text-white font-sora">
            <span className="font-bold">Block</span>
            <span className="font-normal">Mind</span>
          </span>
        </Link>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-12">시행일: 2026년 3월 14일</p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. 개인정보 처리자 정보</h2>
            <p>BlockMind 서비스(이하 &quot;서비스&quot;)는 개인 운영자가 제공하는 AI 채팅 서비스입니다.</p>
            <ul className="mt-3 space-y-1 text-gray-400">
              <li>제공자: 유예성</li>
              <li>이메일: yesung4133@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. 수집하는 개인정보 항목</h2>
            <p className="mb-2">서비스는 다음과 같은 개인정보를 수집합니다.</p>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-200">Google 소셜 로그인 시</p>
                <ul className="mt-1 list-disc list-inside text-gray-400 space-y-1">
                  <li>이메일 주소</li>
                  <li>이름</li>
                  <li>프로필 사진 URL</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-200">이메일 로그인 시</p>
                <ul className="mt-1 list-disc list-inside text-gray-400 space-y-1">
                  <li>이메일 주소</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-200">서비스 이용 중 생성되는 정보</p>
                <ul className="mt-1 list-disc list-inside text-gray-400 space-y-1">
                  <li>AI와의 채팅 내용(메시지, 세션 제목)</li>
                  <li>맥락 블록(Context Block) 데이터</li>
                  <li>업로드한 파일(이미지, PDF 등)</li>
                  <li>서비스 이용 일시 등 로그 정보</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>회원 식별 및 서비스 제공</li>
              <li>AI 채팅 기능 및 맥락 블록 관리 기능 제공</li>
              <li>서비스 개선 및 오류 대응</li>
              <li>법령상 의무 이행</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. 개인정보 보유 및 파기</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-200">
                    <th className="text-left px-4 py-2 border-b border-gray-700">항목</th>
                    <th className="text-left px-4 py-2 border-b border-gray-700">보유 기간</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-2">업로드 파일(이미지/PDF 등)</td>
                    <td className="px-4 py-2">업로드 후 48시간</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-2">채팅 내용, 블록, 계정 정보</td>
                    <td className="px-4 py-2">회원 탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">탈퇴 후 데이터</td>
                    <td className="px-4 py-2">즉시 파기(복구 불가)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-gray-500 text-xs">단, 관련 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관 후 파기합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. 개인정보의 제3자 제공 및 위탁</h2>
            <p className="mb-3">서비스는 아래 외부 서비스에 개인정보 처리를 위탁하거나 데이터가 전송됩니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-200">
                    <th className="text-left px-4 py-2 border-b border-gray-700">수탁사</th>
                    <th className="text-left px-4 py-2 border-b border-gray-700">위탁 목적</th>
                    <th className="text-left px-4 py-2 border-b border-gray-700">전송 데이터</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-2">Google LLC</td>
                    <td className="px-4 py-2">소셜 로그인 인증</td>
                    <td className="px-4 py-2">이메일, 이름, 프로필 사진</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-2">Google LLC (Gemini API)</td>
                    <td className="px-4 py-2">AI 채팅 응답 생성</td>
                    <td className="px-4 py-2">채팅 메시지, 업로드 파일, 맥락 블록 내용</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Supabase Inc.</td>
                    <td className="px-4 py-2">데이터베이스 및 파일 저장</td>
                    <td className="px-4 py-2">계정 정보, 채팅 데이터, 업로드 파일</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-gray-500 text-xs">
              Gemini API로 전송된 채팅 내용은 Google의 개인정보처리방침에 따라 처리되며, Google의 AI 모델 학습 등에 사용될 수 있습니다.
              자세한 내용은 Google의 개인정보처리방침을 참조하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. 만 14세 미만 아동의 이용 제한</h2>
            <p>
              서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 만 14세 미만인 경우 서비스를 이용할 수 없습니다.
              만 14세 미만 아동의 개인정보가 수집된 사실이 확인될 경우 즉시 해당 정보를 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. 이용자의 권리</h2>
            <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>개인정보 열람 요청</li>
              <li>개인정보 정정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>서비스 탈퇴를 통한 동의 철회</li>
            </ul>
            <p className="mt-3 text-gray-400">
              권리 행사는 yesung4133@gmail.com으로 요청하시면 지체 없이 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. 쿠키 및 세션</h2>
            <p>
              서비스는 로그인 인증 유지를 위해 세션 쿠키를 사용합니다. 브라우저 설정을 통해 쿠키를 거부할 수 있으나,
              이 경우 로그인이 필요한 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. 개인정보 보호책임자</h2>
            <ul className="text-gray-400 space-y-1">
              <li>성명: 유예성</li>
              <li>이메일: yesung4133@gmail.com</li>
              <li>연락처: 010-3034-2217</li>
            </ul>
            <p className="mt-3 text-gray-500 text-xs">
              개인정보 침해 관련 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, ☎ 118)에 문의하실 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. 방침 변경</h2>
            <p>
              본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지 또는 이메일을 통해 사전 고지합니다.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
