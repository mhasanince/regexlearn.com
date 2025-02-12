/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { toast } from "react-toastify";
import cx from "classnames";
import _ from "lodash";
import lookie from "lookie";

import Mousetrap from "../../utils/mousetrap";
import setCaretPosition from "../../utils/setCaretPosition";
import tagWrapper from "../../utils/tagWrapper";

import Hint from "../Hint";
import ReportStep from "../ReportStep";
import FlagBox from "../FlagBox";

import shortcuts from "../../shortcuts";

function InteractiveArea({ data, step, isShow, parentError, onChangeSuccess }) {
  const { formatMessage } = useIntl();
  const regexInput = useRef(null);
  const [regex, setRegex] = useState(data.initialValue || "");
  const [flags, setFlags] = useState(data.initialFlags || "");
  const [isChanged, setIsChanged] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [match, setMatch] = useState(false);

  const checkRegex = () => {
    if (data.interactive === false) return true;

    try {
      let $regex = regex;
      [...$regex.matchAll(/\\(\d+)/g)].forEach((item) => {
        $regex = $regex.replace(
          `\\${item[1]}`,
          `\\${parseInt(item[1], 10) + 1}`
        );
      });

      const reg = new RegExp(`(${$regex})`, flags);
      const matchType = flags?.includes("g") ? "matchAll" : "match";
      const isMatchAll = matchType === "matchAll";
      const regResult = [...data.content[matchType](reg)]
        .map((res) => (isMatchAll ? res[0] : res))
        .filter((res) => !!res);

      const isMatch =
        data.answer.length === regResult.length &&
        _.isEmpty(_.xor(data.answer, regResult));

      const isSuccess =
        isMatch &&
        data.regex.includes(regex) &&
        _.isEmpty(_.xor(data.flags.split(""), flags.split("")));

      setMatch(isMatch);
      setSuccess(isSuccess);

      toast.dismiss();

      if (regex) {
        setContent(
          tagWrapper(data.content, reg, "step-interactive-result-tag")
        );
      } else {
        setContent(data.content);
      }

      if (isChanged && isSuccess) {
        toast.success(formatMessage({ id: "general.completedStep" }), {
          theme: "colored",
          autoClose: true,
          position: "top-center",
        });

        const completedSteps = lookie.get("completedSteps") || [];

        if (!completedSteps.includes(data.title)) {
          completedSteps.push(data.title);
          lookie.set("completedSteps", completedSteps);
        }

        setError(false);
      } else if (isMatch) {
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.log(err);
      setError(true);
    }
  };

  const onChange = (e) => {
    setIsChanged(true);
    setRegex(e.target.value);
  };

  const focusInput = () => {
    if (regexInput?.current) {
      regexInput.current.focus();
    }
  };

  const blurInput = () => {
    if (regexInput?.current) {
      regexInput.current.blur();
    }
  };

  useEffect(() => {
    setError(false);
    setSuccess(false);

    toast.dismiss();

    if (data.interactive === false) {
      setSuccess(true);
      return;
    }

    const progress = lookie.get("completedSteps") || [];
    const isCompletedStep = progress.includes(data.title);

    checkRegex();
    setContent(data.content);
    setFlags(isCompletedStep ? data.flags : data.initialFlags || "");
    setRegex((isCompletedStep ? data.regex[0] : data.initialValue) || "");
    setIsChanged(false);
    blurInput();
    setTimeout(() => {
      setCaretPosition(regexInput.current, data.cursorPosition || 0);
      focusInput();
    }, 300);
  }, [step, data.cursorPosition]);

  useEffect(() => {
    onChangeSuccess(success);
  }, [success, onChangeSuccess]);

  useEffect(() => {
    Mousetrap.bindGlobal(shortcuts.focus, (e) => {
      e.preventDefault();
      focusInput();
    });

    return () => Mousetrap.unbind(shortcuts.focus);
  }, []);

  useEffect(checkRegex, [regex, flags, step]);

  if (!isShow) return null;

  const highlightedContent = (content || data.content || "").replace(
    /\n/gm,
    "<br />"
  );

  const placeholder = formatMessage({
    id: "general.regex",
  }).toLowerCase();

  return (
    <div
      className={cx("step-interactive", {
        error,
        success,
        match,
        parentError,
      })}
    >
      <div
        className="step-interactive-block step-interactive-block-content"
        data-title={formatMessage({ id: "general.text" })}
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      <div
        className="step-interactive-block step-interactive-block-regex"
        data-title={formatMessage({ id: "general.regex" })}
      >
        <ReportStep data={data} step={step} />
        <Hint regex={data.regex} flags={data.flags} />
        <div className="step-interactive-input" data-flags={flags}>
          <input
            ref={regexInput}
            key={step}
            type="text"
            style={{ width: regex.length * 15 || 60 }}
            readOnly={data.readOnly}
            value={regex}
            onChange={onChange}
            placeholder={placeholder}
            spellCheck={false}
          />
        </div>
        {data.useFlagsControl && <FlagBox onChange={setIsChanged} flags={flags} setFlags={setFlags} />}
      </div>
    </div>
  );
}

export default InteractiveArea;
