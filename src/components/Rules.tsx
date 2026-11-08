import { MODULAR, MODULES_SOURCE } from "../data/modules";
import { GRAD, LIBERAL_AREAS, LIBERAL_REQUIRED, MODE_RULES, RENAMES_2027, SOURCES, TRACK_RULES } from "../data/rules";

export function Rules() {
  return (
    <section className="panel" id="p-rules">
      <div className="panel-head">
        <div>
          <h2>졸업요건과 트랙 제도</h2>
          <p>한성대학교 공식 페이지에서 확인한 기준이에요. 학번·학기마다 바뀔 수 있으니 신청 전에는 학사 공지를 다시 확인하세요.</p>
        </div>
      </div>

      <div className="rules-grid">
        <div className="card">
          <h3>졸업요건 (2016학번 이후)</h3>
          <table className="kv">
            <tbody>
              <tr>
                <th>교과</th>
                <td>{GRAD.total}학점</td>
              </tr>
              <tr>
                <th>전공</th>
                <td>
                  {GRAD.major}학점 · 트랙당 {GRAD.perTrack}학점 ({GRAD.perTrackDetail})
                </td>
              </tr>
              <tr>
                <th>교양</th>
                <td>
                  {GRAD.liberal}학점 · {GRAD.liberalDetail}
                </td>
              </tr>
              <tr>
                <th>자유선택</th>
                <td>{GRAD.free}학점</td>
              </tr>
              <tr>
                <th>학기당 수강</th>
                <td>
                  6~{GRAD.semesterMax}학점 · 학점이월 포함 최대 {GRAD.semesterMaxCarry}학점 (16학번 이후)
                </td>
              </tr>
              <tr>
                <th>비교과</th>
                <td>{GRAD.extraPoints}pt (미충족 시 수료 처리)</td>
              </tr>
              <tr>
                <th>트랙별</th>
                <td>제1·제2트랙 각각의 졸업요건(캡스톤·작품·시험 등) 충족</td>
              </tr>
            </tbody>
          </table>
          <p className="src">
            출처: <a href={SOURCES.graduation.url}>{SOURCES.graduation.label}</a> · <a href={SOURCES.studyGuide.url}>{SOURCES.studyGuide.label}</a> ·{" "}
            <a href={SOURCES.creditLimit.url}>{SOURCES.creditLimit.label}</a>
          </p>
        </div>

        <div className="card">
          <h3>비교과포인트 (High-Success Point)</h3>
          <ul>
            <li>2016학년도 입학자부터 {GRAD.extraPoints}pt가 졸업요건이에요.</li>
            <li>학기마다 최대 {GRAD.semesterCap}pt까지 인정되고, 초과분은 200pt 한도로 다음 학기로 이월돼요.</li>
            <li>유형: 봉사, 공모전·대회, 특강·워크숍, 소모임·멘토링, 어학·자격, 상담·검사, 현장체험활동</li>
            <li>프로그램별 포인트는 매 학기 스마트자기관리시스템에 공지돼요.</li>
            <li>HSP(High Success Project): 3개월 100pt, 6개월 200pt, 12개월 300pt · 활동지원금 1인 10만·15만·20만원</li>
            <li>한성인재인증: 영역별 교양 3학점, 캡스톤디자인 수강, 해당 영역 비교과 250pt 이상과 프로그램 2개 이상</li>
          </ul>
          <p className="src">
            출처: <a href={SOURCES.extracurricular.url}>{SOURCES.extracurricular.label}</a> · <a href={SOURCES.hsp.url}>{SOURCES.hsp.label}</a> ·{" "}
            <a href={SOURCES.certification.url}>{SOURCES.certification.label}</a>
          </p>
        </div>

        <div className="card">
          <h3>교양 (24학번 이후 31학점)</h3>
          <ul>
            <li>교양필수 13학점: {LIBERAL_REQUIRED.map((x) => x.name).join(", ")} (1학년 필수)</li>
            <li>
              선택필수교양 15학점: 배분이수 영역 {LIBERAL_AREAS.length}개({LIBERAL_AREAS.map((a) => a.name).join(", ")}) 중 4개 영역 이상에서 1과목 이상
            </li>
            <li>자율선택 3학점 이상 · 19~23학번 28학점, 17~18학번 22학점</li>
          </ul>
          <p className="src">
            출처: <a href={SOURCES.liberal.url}>{SOURCES.liberal.label}</a>
          </p>
        </div>

        <div className="card">
          <h3>모듈형 전공교육과정 (2026 시범)</h3>
          <ul>
            <li>전공 과목을 역량 단위 '모듈'(4과목 내외)로 묶고, 진로에 맞는 모듈을 조합해 듣는 방식이에요.</li>
            <li>시범 트랙: {Object.keys(MODULAR).join(", ")}</li>
            <li>모듈 과목을 모두 들을 필요는 없고 졸업요건은 같아요. 로드맵은 고른 진로 경로의 모듈 과목을 전공선택에 먼저 넣어요.</li>
          </ul>
          <p className="src">
            출처: <a href={MODULES_SOURCE.url}>{MODULES_SOURCE.label}</a>
          </p>
        </div>

        <div className="card wide">
          <h3>전공 이수 방식 (17학번 이후)</h3>
          <table className="kv">
            <tbody>
              {(["fusion1", "fusion2", "deep"] as const).map((m) => (
                <tr key={m}>
                  <th>{MODE_RULES[m].name}</th>
                  <td>
                    {MODE_RULES[m].desc}
                    {MODE_RULES[m].deptOnly ? " · 학과 소속" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul>
            <li>트랙제로 입학한 학생은 2학년 진학 시 제1트랙과 제2트랙을 모두 골라야 해요.</li>
            <li>학과 소속 학생은 제2트랙 없이 심화전공(78학점)이나 학과 57학점 + 부전공 21학점(융합전공Ⅱ)으로도 이수할 수 있어요.</li>
            <li>어느 방식이든 부전공(21학점)을 더 붙이거나 Micro Degree를 추가할 수 있어요.</li>
          </ul>
          <p className="src">
            출처: <a href={SOURCES.majorCredits.url}>{SOURCES.majorCredits.label}</a> · <a href={SOURCES.trackSystem.url}>{SOURCES.trackSystem.label}</a>
          </p>
        </div>

        <div className="card wide">
          <h3>트랙 선택·변경 규칙</h3>
          <dl className="rules">
            {TRACK_RULES.map((r) => (
              <div key={r.title}>
                <dt>{r.title}</dt>
                <dd>{r.body}</dd>
              </div>
            ))}
          </dl>
          <p className="src">
            출처: <a href={SOURCES.trackSystem.url}>{SOURCES.trackSystem.label}</a>
          </p>
        </div>

        <div className="card wide">
          <h3>2027학년도 학사조직 개편 (명칭 변경)</h3>
          <ul className="renames">
            {RENAMES_2027.map((r) => (
              <li key={r.from}>
                {r.from} <span aria-hidden="true">→</span> <b>{r.to}</b>
              </li>
            ))}
          </ul>
          <p className="src">
            출처: <a href={SOURCES.colleges.url}>{SOURCES.colleges.label}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
