import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Calculator as CalculatorIcon } from "lucide-react";

export default function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    setDisplay(String(-parseFloat(display)));
  };

  const inputPercent = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      setPreviousValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (left, right, op) => {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "×":
        return left * right;
      case "÷":
        return right !== 0 ? left / right : 0;
      default:
        return right;
    }
  };

  const handleEquals = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(previousValue, inputValue, operation);

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const ButtonCalc = ({ children, onClick, className = "", variant = "default" }) => {
    const baseClasses = "h-14 text-lg font-semibold rounded-2xl transition-all active:scale-95";
    const variants = {
      default: "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]",
      operator: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30",
      function: "bg-slate-600 hover:bg-slate-700 text-white",
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const formatDisplay = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    if (value.endsWith(".")) return value;
    if (value.includes(".") && value.endsWith("0") && !waitingForOperand) return value;
    
    if (Math.abs(num) >= 1e9) {
      return num.toExponential(4);
    }
    return num.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl bg-[#0B0F19] border border-white/[0.1] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Calculadora</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Display */}
          <div className="p-5 pb-3">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 min-h-[80px] flex items-end justify-end">
              <span className="text-3xl font-bold text-white tracking-tight">
                {formatDisplay(display)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="p-4 pt-2">
            <div className="grid grid-cols-4 gap-2">
              <ButtonCalc onClick={clear} variant="function">C</ButtonCalc>
              <ButtonCalc onClick={toggleSign} variant="function">±</ButtonCalc>
              <ButtonCalc onClick={inputPercent} variant="function">%</ButtonCalc>
              <ButtonCalc onClick={() => performOperation("÷")} variant="operator">÷</ButtonCalc>

              <ButtonCalc onClick={() => inputDigit("7")}>7</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("8")}>8</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("9")}>9</ButtonCalc>
              <ButtonCalc onClick={() => performOperation("×")} variant="operator">×</ButtonCalc>

              <ButtonCalc onClick={() => inputDigit("4")}>4</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("5")}>5</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("6")}>6</ButtonCalc>
              <ButtonCalc onClick={() => performOperation("-")} variant="operator">−</ButtonCalc>

              <ButtonCalc onClick={() => inputDigit("1")}>1</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("2")}>2</ButtonCalc>
              <ButtonCalc onClick={() => inputDigit("3")}>3</ButtonCalc>
              <ButtonCalc onClick={() => performOperation("+")} variant="operator">+</ButtonCalc>

              <ButtonCalc onClick={() => inputDigit("0")} className="col-span-2">0</ButtonCalc>
              <ButtonCalc onClick={inputDecimal}>.</ButtonCalc>
              <ButtonCalc onClick={handleEquals} variant="operator">=</ButtonCalc>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
