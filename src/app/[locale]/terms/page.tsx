import { Link } from '@/i18n/navigation';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">이용약관</h1>
        <p className="text-sm text-gray-500 mb-12">시행일: 2026년 3월 14일</p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 유예성(이하 &quot;제공자&quot;)이 제공하는 BlockMind 서비스(이하 &quot;서비스&quot;)의 이용 조건 및
              절차, 제공자와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제2조 (정의)</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>
                <span className="text-gray-200 font-medium">&quot;서비스&quot;</span>란 BlockMind가 제공하는
                AI 채팅 및 맥락 블록(Context Block) 관리 기능 일체를 말합니다.
              </li>
              <li>
                <span className="text-gray-200 font-medium">&quot;이용자&quot;</span>란 본 약관에 동의하고
                서비스에 로그인하여 이용하는 자를 말합니다.
              </li>
              <li>
                <span className="text-gray-200 font-medium">&quot;맥락 블록&quot;</span>이란 AI에게 전달되는
                페르소나, 규칙, 데이터 등 이용자가 직접 관리하는 컨텍스트 단위를 말합니다.
              </li>
              <li>
                <span className="text-gray-200 font-medium">&quot;콘텐츠&quot;</span>란 이용자가 서비스를 통해
                입력·업로드하거나 AI가 생성한 텍스트, 이미지, 파일 등 일체를 말합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
              <li>제공자는 합리적인 사유가 있을 경우 약관을 변경할 수 있으며, 변경 시 시행 7일 전에 공지합니다.</li>
              <li>이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제4조 (서비스 이용 자격)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>서비스는 만 14세 이상인 자만 이용할 수 있습니다.</li>
              <li>Google OAuth 또는 이메일 OTP를 통한 인증을 완료한 자에 한해 서비스를 이용할 수 있습니다.</li>
              <li>이전에 이용 제한 또는 계정 정지를 받은 자는 재가입이 제한될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제5조 (서비스 제공)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>서비스는 현재 무료로 제공됩니다.</li>
              <li>제공자는 서비스의 내용, 운영 방식 등을 필요에 따라 변경하거나 종료할 수 있으며, 이 경우 사전에 공지합니다.</li>
              <li>서비스는 연중무휴 24시간 제공을 원칙으로 하나, 정기점검·시스템 장애·외부 API 장애 등으로 일시 중단될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제6조 (이용자의 의무)</h2>
            <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>타인의 개인정보, 계정을 무단으로 사용하는 행위</li>
              <li>서비스 운영을 방해하거나 시스템에 과부하를 일으키는 행위</li>
              <li>불법적인 콘텐츠(아동 성착취물, 저작권 침해 자료 등)를 입력하거나 업로드하는 행위</li>
              <li>타인을 비방·협박하거나 명예를 훼손하는 행위</li>
              <li>서비스를 상업적 목적으로 무단 이용하는 행위</li>
              <li>관련 법령을 위반하는 모든 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제7조 (콘텐츠에 관한 권리)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>이용자가 직접 작성한 맥락 블록 및 채팅 입력 내용의 저작권은 이용자에게 있습니다.</li>
              <li>AI가 생성한 응답의 저작권은 관련 법령 및 Google의 이용약관에 따릅니다.</li>
              <li>이용자는 서비스 개선 목적으로 제공자가 익명화·집계된 이용 데이터를 분석하는 것에 동의합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제8조 (AI 서비스 관련 면책)</h2>
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-gray-400 space-y-2">
              <p>
                서비스는 Google Gemini AI를 기반으로 동작하며, AI가 생성하는 응답은 자동 생성된 결과물입니다.
                제공자는 다음에 대해 책임을 지지 않습니다.
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>AI 응답의 정확성, 완전성, 신뢰성</li>
                <li>AI 응답을 근거로 한 이용자의 판단 또는 행동의 결과</li>
                <li>Gemini API를 통해 Google에 전송된 데이터의 처리에 관한 사항</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                AI의 응답을 의료, 법률, 금융 등 전문 분야의 조언으로 사용하지 마십시오.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제9조 (계정 정지 및 이용 제한)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>제공자는 이용자가 제6조를 위반한 경우 사전 통보 없이 계정을 정지하거나 서비스 이용을 제한할 수 있습니다.</li>
              <li>이용 제한 조치에 이의가 있는 경우 yesung4133@gmail.com으로 이의를 제기할 수 있습니다.</li>
              <li>장기간(12개월 이상) 미이용 계정은 사전 고지 후 삭제될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제10조 (서비스 이용 중단 및 탈퇴)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>이용자는 언제든지 서비스 내 탈퇴 기능을 통해 회원 탈퇴를 요청할 수 있습니다.</li>
              <li>탈퇴 시 채팅 내용, 맥락 블록, 계정 정보 등 모든 데이터가 즉시 삭제되며 복구할 수 없습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제11조 (제공자의 책임 제한)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>제공자는 천재지변, 전쟁, 외부 API 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>제공자는 이용자 간 또는 이용자와 제3자 간의 분쟁에 개입하지 않으며, 이로 인한 손해를 배상하지 않습니다.</li>
              <li>서비스는 현재 &quot;있는 그대로(as-is)&quot; 제공되며, 특정 목적에의 적합성을 보증하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제12조 (준거법 및 관할)</h2>
            <ol className="list-decimal list-inside text-gray-400 space-y-2">
              <li>본 약관은 대한민국 법률에 따라 해석됩니다.</li>
              <li>서비스 이용과 관련한 분쟁은 민사소송법상 관할 법원을 제1심 관할 법원으로 합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">제13조 (문의)</h2>
            <ul className="text-gray-400 space-y-1">
              <li>이메일: yesung4133@gmail.com</li>
            </ul>
          </section>

        </div>
      </main>
    </div>
  );
}
