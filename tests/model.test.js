import test from 'node:test';import assert from 'node:assert/strict';
import {assess,questions,priorities,reportText} from '../public/model.js';
test('neutral defaults are not observations',()=>{const a=assess();assert.equal(a.brand,null);assert.equal(a.experience,null);assert.equal(a.answered,0);assert.equal(priorities({}).length,1);});
test('zero is real, partial categories unavailable',()=>{const a=assess({reputation:0,visibility:0,promise:0});assert.equal(a.brand,0);assert.equal(a.experience,null);assert.equal(a.answered,3);});
test('invalid values are not coerced',()=>{for(const value of [null,undefined,'',false,'5',-1,11,NaN,Infinity])assert.equal(assess({reputation:value}).dimensions.reputation,null);});
test('equal weights and tied priorities',()=>{const answers=Object.fromEntries(questions.map(([k])=>[k,5]));const a=assess(answers);assert.equal(a.brand,50);assert.equal(a.experience,50);assert.equal(priorities(answers).length,6);});
test('report excludes default scores and null text',()=>{const text=reportText({answers:{}});assert.doesNotMatch(text,/50\/100|null|undefined/);assert.match(text,/Ikke besvart/);assert.match(text,/Utilgjengelig/);});
test('report preserves confirmed zero and manual source',()=>{const text=reportText({answers:{reputation:0,visibility:0},company:{name:'Testbedrift',source:'Oppgitt av arbeidsgiver'}});assert.match(text,/0\/100/);assert.match(text,/Oppgitt av arbeidsgiver/);});
