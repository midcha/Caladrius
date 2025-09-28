"use client";

import ui from "./ui.module.css";
import s from "./SuccessNotice.module.css";
import Image from "next/image";

export default function SuccessNotice() {
  return (
    <div className={s.container}>
      <div className={`${s.box} ${s.content}`}>
        <div className={s.logoWrap}>
          <Image
            src="/caladrius.png"
            alt="Caladrius logo"
            width={128}
            height={128}
            className={s.logo}
            priority
          />
        </div>
        <p className={ui.kicker}>Complete</p>
        <h3 className={`${ui.title} ${s.bigTitle}`}>
          Thanks for answering. Your triage has been recorded.
        </h3>
        <p className={`${ui.sub} ${s.subLarge}`}>
          You may be called by a clinician shortly.
        </p>
      </div>
    </div>
  );
}
