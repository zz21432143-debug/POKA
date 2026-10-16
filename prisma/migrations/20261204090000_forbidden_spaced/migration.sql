-- 금지어 정리: 「자 지」처럼 글자 사이를 띄운 짧은 단어는 정상 문장(「이상자 지원」)을 막아서 지움(여러 번 실행해도 같은 결과)
DELETE FROM "ForbiddenWord" WHERE "word" ~ '\s' AND length(regexp_replace("word", '\s+', '', 'g')) <= 3;
