'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Slice, COLORS, formatPercent, splitTopAndOthers, SchoolRow } from './schoolChartShared';

// インカレサークルBELL専用のハードコードされた参加実績データ（仮割合）。
// エリアごとに専門学校の参加分布を出す。まだ東京エリアしかデータがなく、
// 他エリアはデータが揃い次第REGIONSに追加する。
const TOKYO: Slice[] = [
  { name: '東京ビューティーアート専門学校', value: 0.964 },
  { name: '東京ビューティー＆ブライダル専門学校', value: 0.911 },
  { name: '文化服装学院', value: 0.911 },
  { name: '資生堂美容技術専門学校', value: 0.857 },
  { name: '国際文化理容美容専門学校渋谷校', value: 0.803 },
  { name: '日本美容専門学校', value: 0.803 },
  { name: '原宿ベルエポック美容専門学校', value: 0.803 },
  { name: '山野美容専門学校', value: 0.803 },
  { name: '国際文化理容美容専門学校国分寺校', value: 0.75 },
  { name: '東京総合美容専門学校', value: 0.75 },
  { name: '東京ベルエポック美容専門学校', value: 0.75 },
  { name: 'ハリウッド美容専門大学校', value: 0.75 },
  { name: '東京医薬看護専門学校', value: 0.701 },
  { name: '服部栄養専門学校', value: 0.614 },
  { name: '東京医療秘書歯科衛生＆IT専門学校', value: 0.592 },
  { name: '東京製菓学校', value: 0.579 },
  { name: 'アポロ美容理容専門学校', value: 0.536 },
  { name: 'アルファ医療福祉美容専門学校', value: 0.536 },
  { name: '窪田理容美容専門学校', value: 0.536 },
  { name: '国際理容美容専門学校', value: 0.536 },
  { name: 'コーセー美容専門学校', value: 0.536 },
  { name: '渋谷美容専門学校', value: 0.536 },
  { name: '専門学校エビスビューティカレッジ', value: 0.536 },
  { name: '高山美容専門学校', value: 0.536 },
  { name: '中央理美容専門学校', value: 0.536 },
  { name: '東京美容専門学校', value: 0.536 },
  { name: '東京文化美容専門学校', value: 0.536 },
  { name: '東京マックス美容専門学校', value: 0.536 },
  { name: '町田美容専門学校', value: 0.536 },
  { name: '真野美容専門学校', value: 0.536 },
  { name: 'マリールイズ美容専門学校', value: 0.536 },
  { name: 'ミス・パリ・ビューティ専門学校 東京校', value: 0.536 },
  { name: '早稲田美容専門学校', value: 0.536 },
  { name: '東京モード学園', value: 0.511 },
  { name: '専門学校日本ホテルスクール', value: 0.511 },
  { name: '神田外語学院', value: 0.493 },
  { name: '専門学校駿台観光＆ホテルブライダルビジネスカレッジ', value: 0.487 },
  { name: '東京ウェディング＆ブライダル専門学校', value: 0.487 },
  { name: '東京ウェディング・ホテル専門学校', value: 0.487 },
  { name: '東京スクールオブミュージック＆ダンス専門学校', value: 0.487 },
  { name: '東京文化ブライダル専門学校', value: 0.487 },
  { name: 'HAL東京', value: 0.487 },
  { name: '専門学校桑沢デザイン研究所', value: 0.475 },
  { name: '日本工学院専門学校', value: 0.475 },
  { name: '愛国学園保育専門学校', value: 0.463 },
  { name: 'アポロ歯科衛生士専門学校', value: 0.463 },
  { name: '大原医療秘書福祉保育専門学校', value: 0.463 },
  { name: '玉成保育専門学校', value: 0.463 },
  { name: '彰栄保育福祉専門学校', value: 0.463 },
  { name: '新東京歯科衛生士学校', value: 0.463 },
  { name: '聖徳大学幼児教育専門学校', value: 0.463 },
  { name: '草苑保育専門学校', value: 0.463 },
  { name: '太陽歯科衛生士専門学校', value: 0.463 },
  { name: '竹早教員保育士養成所', value: 0.463 },
  { name: '東京歯科衛生専門学校', value: 0.463 },
  { name: '東京西の森歯科衛生士専門学校', value: 0.463 },
  { name: '東京福祉保育専門学校', value: 0.463 },
  { name: '東京保育専門学校', value: 0.463 },
  { name: '東京町田歯科衛生学院専門学校', value: 0.463 },
  { name: '東京未来大学福祉保育専門学校', value: 0.463 },
  { name: '東京YMCA社会体育・保育専門学校', value: 0.463 },
  { name: '日本ウェルネス歯科衛生専門学校', value: 0.463 },
  { name: '日本大学歯学部附属歯科衛生専門学校', value: 0.463 },
  { name: '町田福祉保育専門学校', value: 0.463 },
  { name: '東京デザイン専門学校', value: 0.443 },
  { name: '東京デザインテクノロジーセンター専門学校', value: 0.443 },
  { name: '大竹栄養専門学校', value: 0.438 },
  { name: '織田ファッション専門学校', value: 0.438 },
  { name: '吉祥寺二葉栄養調理専門職学校', value: 0.438 },
  { name: '佐伯栄養専門学校', value: 0.438 },
  { name: '至誠会看護専門学校', value: 0.438 },
  { name: '渋谷ファッション＆アート専門学校', value: 0.438 },
  { name: '専門学校青山ファッションカレッジ', value: 0.438 },
  { name: '専門学校ファッションカレッジ桜丘', value: 0.438 },
  { name: '専門学校武蔵野ファッションカレッジ', value: 0.438 },
  { name: '東京栄養食糧専門学校', value: 0.438 },
  { name: '東京栄養専門学校', value: 0.438 },
  { name: '東京墨田看護専門学校', value: 0.438 },
  { name: '東京ファッション専門学校', value: 0.438 },
  { name: '東京服飾専門学校', value: 0.438 },
  { name: '日本外国語専門学校', value: 0.438 },
  { name: '華学園栄養専門学校', value: 0.438 },
  { name: '華服飾専門学校', value: 0.438 },
  { name: 'ファッションビジネス＆クリエイティブカレッジ', value: 0.438 },
  { name: '武蔵野栄養専門学校', value: 0.438 },
  { name: '目白ファッション＆アートカレッジ', value: 0.438 },
  { name: '日本工学院八王子専門学校', value: 0.42 },
  { name: '赤堀製菓専門学校', value: 0.414 },
  { name: '織田きもの専門学校', value: 0.414 },
  { name: '織田製菓専門学校', value: 0.414 },
  { name: '香川調理製菓専門学校', value: 0.414 },
  { name: '吉祥寺二葉製菓専門職学校', value: 0.414 },
  { name: '国際製菓専門学校', value: 0.414 },
  { name: '専門学校清水とき・きものアカデミア', value: 0.414 },
  { name: '東京コミュニケーションアート専門学校', value: 0.414 },
  { name: '東京多摩調理製菓専門学校', value: 0.414 },
  { name: '東京調理製菓専門学校', value: 0.414 },
  { name: '東京服装文化学院', value: 0.414 },
  { name: '東京フード製菓中医薬専門学校', value: 0.414 },
  { name: '東京ベルエポック製菓調理専門学校', value: 0.414 },
  { name: '東京マスダ学院文化服装専門学校', value: 0.414 },
  { name: '華調理製菓専門学校', value: 0.414 },
  { name: '町田製菓専門学校', value: 0.414 },
  { name: '宮川文化服装専門学校', value: 0.414 },
  { name: '山手調理製菓専門学校', value: 0.414 },
  { name: '大原簿記医療秘書公務員専門学校町田校', value: 0.393 },
  { name: '大原簿記公務員医療福祉保育専門学校立川校', value: 0.393 },
  { name: '首都医校', value: 0.39 },
  { name: '東京こども専門学校', value: 0.39 },
  { name: '国際動物専門学校', value: 0.365 },
  { name: '品川介護福祉専門学校', value: 0.365 },
  { name: '千住介護福祉専門学校', value: 0.365 },
  { name: '専門学校日本動物21', value: 0.365 },
  { name: '中央動物専門学校', value: 0.365 },
  { name: 'TCA東京ECO動物海洋専門学校', value: 0.365 },
  { name: '東京医療福祉専門学校', value: 0.365 },
  { name: '東京心理音楽療法福祉専門学校', value: 0.365 },
  { name: '東京福祉専門学校', value: 0.365 },
  { name: '東京YMCA医療福祉専門学校', value: 0.365 },
  { name: '日商簿記三鷹福祉専門学校', value: 0.365 },
  { name: '日本デザイン福祉専門学校', value: 0.365 },
  { name: '日本電子専門学校', value: 0.365 },
  { name: '日本動物専門学校', value: 0.365 },
  { name: '日本福祉教育専門学校', value: 0.365 },
  { name: '日本ペット＆アニマル専門学校', value: 0.365 },
  { name: 'ヤマザキ動物専門学校', value: 0.365 },
  { name: '読売理工医療福祉専門学校', value: 0.365 },
  { name: '早稲田速記医療福祉専門学校', value: 0.365 },
  { name: '専門学校ESPエンタテインメント東京', value: 0.341 },
  { name: '東京エアトラベル・ホテル専門学校', value: 0.341 },
  { name: '東京スイーツ＆カフェ専門学校', value: 0.341 },
  { name: '東京スクールオブミュージック専門学校渋谷', value: 0.341 },
  { name: '東京YMCA国際ホテル専門学校', value: 0.341 },
  { name: 'グレッグ外語専門学校', value: 0.329 },
  { name: 'グレッグ外語専門学校新宿校', value: 0.329 },
  { name: '専門学校駿台外語グローバルビジネスカレッジ', value: 0.329 },
  { name: '専門学校東京ビジネス外語カレッジ', value: 0.329 },
  { name: '東京英語専門学校', value: 0.329 },
  { name: '東京外語専門学校', value: 0.329 },
  { name: '早稲田外語専門学校', value: 0.329 },
  { name: '阿佐ヶ谷美術専門学校', value: 0.317 },
  { name: '織田調理師専門学校', value: 0.317 },
  { name: '御茶の水美術専門学校', value: 0.317 },
  { name: '新宿調理師専門学校', value: 0.317 },
  { name: '創形美術学校', value: 0.317 },
  { name: '中央美術学園', value: 0.317 },
  { name: '辻調理師専門学校 東京', value: 0.317 },
  { name: '東京誠心調理師専門学校', value: 0.317 },
  { name: '東京マスダ学院調理師専門学校', value: 0.317 },
  { name: '東洋美術学校', value: 0.317 },
  { name: '西東京調理師専門学校', value: 0.317 },
  { name: '萠愛調理師専門学校', value: 0.317 },
  { name: '町田調理師専門学校', value: 0.317 },
  { name: '町田デザイン＆建築専門学校', value: 0.317 },
  { name: '武蔵野調理師専門学校', value: 0.317 },
  { name: '山脇美術専門学校', value: 0.317 },
  { name: '音響芸術専門学校', value: 0.304 },
  { name: '専門学校 東京声優・国際アカデミー', value: 0.304 },
  { name: '東京ダンス・俳優＆舞台芸術専門学校', value: 0.304 },
  { name: '日本芸術高等学園', value: 0.304 },
  { name: '日本芸術専門学校', value: 0.304 },
  { name: '日本写真芸術専門学校', value: 0.304 },
  { name: '東京豊島IT医療福祉専門学校', value: 0.292 },
  { name: '東京リゾート＆スポーツ専門学校', value: 0.292 },
  { name: '専門学校アニメ・アーティスト・アカデミー', value: 0.292 },
  { name: '専門学校ミューズ音楽院', value: 0.292 },
  { name: '専門学校ミューズ・モード音楽院', value: 0.292 },
  { name: '東京アニメーションカレッジ専門学校', value: 0.292 },
  { name: '東京アニメーター学院専門学校', value: 0.292 },
  { name: '東放学園映画アニメCG専門学校', value: 0.292 },
  { name: '青山製図専門学校', value: 0.243 },
  { name: '池見東京医療専門学校', value: 0.243 },
  { name: '大原簿記学校', value: 0.243 },
  { name: 'お茶の水はりきゅう専門学校', value: 0.243 },
  { name: '関東リハビリテーション専門学校', value: 0.243 },
  { name: '彰栄リハビリテーション専門学校', value: 0.243 },
  { name: '尚美ミュージックカレッジ専門学校', value: 0.243 },
  { name: '昭和医療技術専門学校', value: 0.243 },
  { name: '新宿医療専門学校', value: 0.243 },
  { name: '新東京歯科技工士学校', value: 0.243 },
  { name: 'JTBツーリズムビジネスカレッジ', value: 0.243 },
  { name: '専修学校中央ゼミナール', value: 0.243 },
  { name: '専門学校社会医学技術学院', value: 0.243 },
  { name: '専門学校ICSカレッジオブアーツ', value: 0.243 },
  { name: '専門学校アジア・アフリカ語学院', value: 0.243 },
  { name: '専門学校インターナショナル・スクール オブ ビジネス', value: 0.243 },
  { name: '専門学校お茶の水スクール・オブ・ビジネス', value: 0.243 },
  { name: '専門学校デジタルアーツ東京', value: 0.243 },
  { name: '専門学校東京アナウンス学院', value: 0.243 },
  { name: '専門学校東京医療学院', value: 0.243 },
  { name: '専門学校東京CPA会計学院', value: 0.243 },
  { name: '専門学校東京テクニカルカレッジ', value: 0.243 },
  { name: '専門学校東京ビジネス・アカデミー', value: 0.243 },
  { name: '専門学校東都リハビリテーション学院', value: 0.243 },
  { name: '専門学校東洋公衆衛生学院', value: 0.243 },
  { name: '専門学校中野スクール・オブ・ビジネス', value: 0.243 },
  { name: '専門学校日本デザイナー学院', value: 0.243 },
  { name: '専門学校ビジョナリーアーツ', value: 0.243 },
  { name: '専門学校ミュージシャンズ・インスティテュート東京', value: 0.243 },
  { name: '多摩リハビリテーション学院専門学校', value: 0.243 },
  { name: '中央医療技術専門学校', value: 0.243 },
  { name: '中央工学校', value: 0.243 },
  { name: 'ディライトグローバル専門学校', value: 0.243 },
  { name: '東京愛犬専門学校', value: 0.243 },
  { name: '東京アニメ・声優&eスポーツ専門学校', value: 0.243 },
  { name: '東京医学技術専門学校', value: 0.243 },
  { name: '東京衛生学園専門学校', value: 0.243 },
  { name: '東京家政専門学校', value: 0.243 },
  { name: '東京眼鏡専門学校', value: 0.243 },
  { name: '東京呉竹医療専門学校', value: 0.243 },
  { name: '東京健康科学専門学校', value: 0.243 },
  { name: '東京立川こども専門学校', value: 0.243 },
  { name: '東京テクノ・ホルティ園芸専門学校', value: 0.243 },
  { name: '東京俳優・映画＆放送専門学校', value: 0.243 },
  { name: '東京バイオテクノロジー専門学校', value: 0.243 },
  { name: '東京ビジネス＆キャリア専門学校', value: 0.243 },
  { name: '東京マルチ・AI専門学校', value: 0.243 },
  { name: '東京理容専修学校', value: 0.243 },
  { name: '東京ロシア語学院', value: 0.243 },
  { name: '東放学園音響専門学校', value: 0.243 },
  { name: '東放学園専門学校', value: 0.243 },
  { name: '東邦歯科医療専門学校', value: 0.243 },
  { name: 'ドレスメーカー学院', value: 0.243 },
  { name: '日中学院', value: 0.243 },
  { name: '日本書道専門学校', value: 0.243 },
  { name: '日本医歯薬専門学校', value: 0.243 },
  { name: '日本医専', value: 0.243 },
  { name: '日本医療ビジネス大学校', value: 0.243 },
  { name: '日本菓子専門学校', value: 0.243 },
  { name: '日本健康医療専門学校', value: 0.243 },
  { name: '日本指圧専門学校', value: 0.243 },
  { name: '日本児童教育専門学校', value: 0.243 },
  { name: '日本総合医療専門学校', value: 0.243 },
  { name: '日本大学歯学部附属歯科技工専門学校', value: 0.243 },
  { name: '日本プリンティングアカデミー', value: 0.243 },
  { name: '日本リハビリテーション専門学校', value: 0.243 },
  { name: '文化外国語専門学校', value: 0.243 },
  { name: 'マネジメントイノベーションテクノロジー専門学校', value: 0.243 },
  { name: '早稲田文理専門学校', value: 0.243 },
  { name: 'エアライン・鉄道・ホテル・テーマパーク専門学校東京', value: 0.239 },
  { name: '東京ホテル・トラベル・鉄道専門学校', value: 0.239 },
  { name: '上野公務員ビジネス専門学校', value: 0.207 },
  { name: '大原ビジネス公務員専門学校池袋校', value: 0.207 },
  { name: '大原法律専門学校', value: 0.207 },
  { name: '専門学校駿台法律経済ビジネスカレッジ', value: 0.207 },
  { name: '中央法律専門学校', value: 0.207 },
  { name: '東京法律公務員専門学校', value: 0.207 },
  { name: '東京法律公務員専門学校杉並校', value: 0.207 },
  { name: '芳澍女学院情報国際専門学校', value: 0.207 },
  { name: '城西放射線技術専門学校', value: 0.195 },
  { name: '専門学校駿台ITビジネスカレッジ', value: 0.195 },
  { name: '東京ITプログラミング＆会計専門学校', value: 0.195 },
  { name: '東京ITプログラミング＆会計専門学校杉並校', value: 0.195 },
  { name: '東京スポーツ・レクリエーション専門学校', value: 0.195 },
  { name: '東京町田情報ITクリエイター専門学校', value: 0.195 },
  { name: '東京みらいAI&IT専門学校', value: 0.195 },
  { name: '東京メディカル・スポーツ専門学校', value: 0.195 },
  { name: '日本ウェルネススポーツ専門学校', value: 0.195 },
  { name: '東京工学院専門学校', value: 0.183 },
  { name: '東京ゴルフ専門学校', value: 0.183 },
  { name: '東京情報クリエイター工学院専門学校', value: 0.183 },
  { name: '東京電子専門学校', value: 0.183 },
  { name: '専門学校日本鉄道＆スポーツビジネスカレッジ', value: 0.17 },
  { name: '専門学校日本鉄道＆スポーツビジネスカレッジ21', value: 0.17 },
  { name: '東洋鍼灸専門学校', value: 0.17 },
  { name: '日本鍼灸理療専門学校', value: 0.17 },
  { name: '関東柔道整復専門学校', value: 0.158 },
  { name: '東京環境工科専門学校', value: 0.158 },
  { name: '東京柔道整復専門学校', value: 0.158 },
  { name: '東京日建工科専門学校', value: 0.158 },
  { name: '日本柔道整復専門学校', value: 0.158 },
  { name: '江東服飾高等専修学校', value: 0.131 },
  { name: '下谷医師会立看護高等専修学校', value: 0.131 },
  { name: '専門学校東京工科自動車大学校', value: 0.11 },
  { name: '専門学校東京工科自動車大学校品川校', value: 0.11 },
  { name: '専門学校東京工科自動車大学校世田谷校', value: 0.11 },
  { name: '専門学校東京自動車大学校', value: 0.11 },
  { name: '専門学校読売自動車大学校', value: 0.11 },
  { name: 'トヨタ東京自動車大学校', value: 0.11 },
  { name: 'すいどーばた美術学院', value: 0.095 },
  { name: '芸術工芸高等専修学校', value: 0.091 },
  { name: '大竹高等専修学校', value: 0.073 },
  { name: '織田学園中野高等専修学校', value: 0.073 },
  { name: '吉祥寺学園高等専修部', value: 0.073 },
  { name: '国際共立学園高等専修学校', value: 0.073 },
  { name: 'すず学園高等専修学校', value: 0.073 },
  { name: '専修学校早稲田予備学校', value: 0.073 },
  { name: '東京表現高等学院 MIICA', value: 0.073 },
  { name: '東放学園高等専修学校', value: 0.073 },
  { name: '野田鎌田学園杉並高等専修学校', value: 0.073 },
];

const SAITAMA: Slice[] = [
  { name: '大宮国際動物専門学校', value: 8.0 },
  { name: '埼玉コンピュータ＆医療事務専門学校', value: 7.5 },
  { name: '中央情報専門学校', value: 7.0 },
  { name: 'さいたまIT・WEB専門学校', value: 6.5 },
  { name: '大宮情報ITクリエイター専門学校', value: 6.0 },
  { name: '西武調理師アート専門学校', value: 5.5 },
  { name: '埼玉県調理師専門学校', value: 5.0 },
  { name: '国際医療専門学校', value: 4.8 },
  { name: '早稲田医療技術専門学校', value: 4.5 },
  { name: '専門学校日本医科学大学校', value: 4.2 },
  { name: '大宮呉竹医療専門学校', value: 4.0 },
  { name: '専門学校埼玉自動車大学校', value: 3.8 },
  { name: 'ホンダテクニカルカレッジ関東', value: 3.5 },
  { name: '専門学校関東工業自動車大学校', value: 3.2 },
  { name: '秋草学園福祉教育専門学校', value: 3.0 },
  { name: '国際航空専門学校', value: 2.8 },
  { name: '埼玉歯科衛生専門学校', value: 2.5 },
  { name: '大宮歯科衛生士専門学校', value: 2.3 },
  { name: 'テクノ・ホルティ園芸専門学校', value: 2.0 },
  { name: '埼玉医療福祉専門学校', value: 1.8 },
  { name: '専門学校越生自動車大学校', value: 1.0 },
  { name: '上尾中央医療専門学校', value: 0.9 },
  { name: '幸手看護専門学校', value: 0.8 },
  { name: '済生会川口看護専門学校', value: 0.8 },
  { name: '埼玉医療福祉会看護専門学校', value: 0.8 },
  { name: 'さいたま柔整専門学校', value: 0.7 },
  { name: '坂戸鶴ヶ島医師会立看護専門学校', value: 0.7 },
  { name: '新洋国際専門学校', value: 0.7 },
  { name: '西武学園医学技術専門学校', value: 0.6 },
  { name: '専門学校浜西ファッションアカデミー', value: 0.6 },
  { name: '秩父看護専門学校', value: 0.6 },
  { name: '東京国際学園外語専門学校', value: 0.5 },
  { name: '東京国際学園情報専門学校', value: 0.5 },
  { name: '所沢看護専門学校', value: 0.5 },
  { name: '戸田中央看護専門学校', value: 0.5 },
  { name: '獨協医科大学附属看護専門学校三郷校', value: 0.5 },
  { name: '日本グローバル専門学校', value: 0.5 },
  { name: '飯能看護専門学校', value: 0.4 },
  { name: '本庄児玉看護専門学校', value: 0.4 },
  { name: '蕨戸田市医師会看護専門学校', value: 0.1 },
];

const CHIBA: Slice[] = [
  { name: '船橋情報ビジネス専門学校', value: 5.5 },
  { name: '千葉ビューティ＆ブライダル専門学校', value: 5.0 },
  { name: '千葉こども専門学校', value: 4.8 },
  { name: '東京IT会計公務員専門学校千葉校', value: 4.5 },
  { name: '専門学校国際理工カレッジ', value: 4.3 },
  { name: '国際トラベル・ホテル・ブライダル専門学校', value: 4.0 },
  { name: '専門学校ちば愛犬動物フラワー学園', value: 3.8 },
  { name: '東洋理容美容専門学校', value: 3.6 },
  { name: '千葉医療秘書＆IT専門学校', value: 3.5 },
  { name: '大原簿記公務員専門学校千葉校', value: 3.4 },
  { name: '大原医療保育福祉専門学校千葉校', value: 3.2 },
  { name: 'パリ総合美容専門学校千葉校', value: 3.0 },
  { name: 'ジェイ ヘアメイク美容専門学校', value: 2.8 },
  { name: 'アイ トータルビューティ専門学校', value: 2.7 },
  { name: '千葉リゾート＆スポーツ専門学校', value: 2.6 },
  { name: 'ハッピー製菓調理専門学校', value: 2.5 },
  { name: '千葉デザイナー学院', value: 2.4 },
  { name: '日本国際工科専門学校', value: 2.3 },
  { name: 'ユニバーサル美容専門学校', value: 2.2 },
  { name: '成田航空ビジネス専門学校', value: 2.1 },
  { name: '大原ビジネス公務員専門学校津田沼校', value: 2.0 },
  { name: '大原ビジネス公務員専門学校柏校', value: 2.0 },
  { name: 'パリ総合美容専門学校柏校', value: 1.9 },
  { name: '千葉情報ITクリエイター専門学校', value: 1.8 },
  { name: '東京情報ITクリエイター専門学校柏校', value: 1.7 },
  { name: '千葉情報経理専門学校', value: 1.6 },
  { name: '千葉モードビジネス専門学校', value: 1.6 },
  { name: '千葉女子専門学校', value: 1.5 },
  { name: '千葉調理師専門学校', value: 1.5 },
  { name: '千葉美容専門学校', value: 1.4 },
  { name: '千葉日建工科専門学校', value: 1.4 },
  { name: '成田国際福祉専門学校', value: 1.3 },
  { name: 'スカイ総合ペット専門学校', value: 1.3 },
  { name: '東京動物専門学校', value: 1.3 },
  { name: '国際医療福祉専門学校', value: 1.2 },
  { name: '江戸川学園おおたかの森専門学校', value: 1.2 },
  { name: '船橋国際福祉専門学校', value: 1.1 },
  { name: '千葉・柏リハビリテーション学院', value: 1.1 },
  { name: '北原学院歯科衛生専門学校', value: 1.0 },
  { name: '北原学院千葉歯科衛生専門学校', value: 1.0 },
  { name: '千葉薬事専門学校', value: 0.9 },
  { name: '習志野調理師専門学校', value: 0.9 },
  { name: '千葉県自動車大学校', value: 0.9 },
  { name: '専門学校日本自動車大学校', value: 0.9 },
  { name: '専門学校日本自動車大学校 袖ケ浦校', value: 0.8 },
  { name: '中央自動車大学校', value: 0.8 },
  { name: '関東鍼灸専門学校', value: 0.8 },
  { name: '八千代リハビリテーション学院', value: 0.8 },
  { name: '専門学校藤リハビリテーション学院', value: 0.7 },
  { name: '千葉医療福祉専門学校', value: 0.7 },
  { name: '医療創生大学歯科衛生専門学校', value: 0.7 },
  { name: '松山学園松山福祉専門学校', value: 0.6 },
  { name: '中央介護福祉専門学校', value: 0.6 },
  { name: '京葉介護福祉専門学校', value: 0.6 },
  { name: '専門学校新国際福祉カレッジ', value: 0.5 },
  { name: 'ユーカリが丘国際福祉専門学校', value: 0.5 },
  { name: '安房医療福祉専門学校', value: 0.5 },
  { name: '安房医療福祉専門学校南房総校', value: 0.4 },
  { name: '千葉市青葉看護専門学校', value: 0.4 },
  { name: '山王看護専門学校', value: 0.4 },
  { name: '慈恵柏看護専門学校', value: 0.4 },
  { name: '千葉労災看護専門学校', value: 0.4 },
  { name: '市原看護専門学校', value: 0.4 },
  { name: '勤医会東葛看護専門学校', value: 0.4 },
  { name: '亀田医療技術専門学校', value: 0.4 },
  { name: '二葉看護学院', value: 0.3 },
  { name: '旭中央病院附属看護専門学校', value: 0.3 },
  { name: 'あびこ助産師専門学校', value: 0.3 },
  { name: 'グローバルキャリア学院', value: 0.3 },
  { name: '専門学校ニホン国際ITカレッジ', value: 0.3 },
  { name: '上野国際ビジネス専門学校', value: 0.3 },
  { name: 'イーストウエスト外国語専門学校', value: 0.2 },
];

const KANAGAWA: Slice[] = [
  { name: '横浜ビューティーアート専門学校', value: 4.8 },
  { name: '横浜fカレッジ', value: 4.55 },
  { name: '横浜ウェディング＆ブライダル専門学校', value: 4.2 },
  { name: '岩谷学園アーティスティックB横浜美容専門学校', value: 3.9 },
  { name: '横浜ベルエポック美容専門学校', value: 3.7 },
  { name: '横浜こども専門学校', value: 3.55 },
  { name: '横浜スイーツ＆カフェ専門学校', value: 3.35 },
  { name: '横浜医療秘書＆IT専門学校', value: 3.2 },
  { name: '横浜理容美容専門学校', value: 3.0 },
  { name: '神奈川ビューティー＆ビジネス専門学校', value: 2.85 },
  { name: '鎌倉早見美容芸術専門学校', value: 2.65 },
  { name: 'アイム湘南理容美容専門学校', value: 2.55 },
  { name: '国際フード製菓専門学校', value: 2.45 },
  { name: '横浜ファッションデザイン専門学校', value: 2.35 },
  { name: '横浜デザイン学院', value: 2.25 },
  { name: '横浜デジタルアーツ専門学校', value: 2.15 },
  { name: '横浜リゾート＆スポーツ専門学校', value: 2.05 },
  { name: '大原医療秘書福祉保育専門学校横浜校', value: 2.0 },
  { name: '横浜動物専門学校', value: 1.9 },
  { name: '湘南歯科衛生士専門学校', value: 1.85 },
  { name: '厚木総合専門学校', value: 1.8 },
  { name: '横浜栄養専門学校', value: 1.75 },
  { name: '横浜保育福祉専門学校', value: 1.7 },
  { name: '聖ヶ丘保育専門学校', value: 1.65 },
  { name: 'YMCA健康福祉専門学校', value: 1.6 },
  { name: '神奈川社会福祉専門学校', value: 1.55 },
  { name: '湘南医療福祉専門学校', value: 1.5 },
  { name: '横浜実践看護専門学校', value: 1.45 },
  { name: '湘南平塚看護専門学校', value: 1.4 },
  { name: '厚木看護専門学校', value: 1.35 },
  { name: '横浜医療専門学校', value: 1.3 },
  { name: '横浜呉竹医療専門学校', value: 1.25 },
  { name: '横浜リハビリテーション専門学校', value: 1.2 },
  { name: '横浜スポーツ＆医療ウェルネス専門学校', value: 1.2 },
  { name: '医療ビジネス観光福祉専門学校', value: 1.15 },
  { name: '情報科学専門学校', value: 1.15 },
  { name: 'アーツカレッジヨコハマ', value: 1.1 },
  { name: '岩谷学園よこはまITビジネス専門学校', value: 1.05 },
  { name: '横浜情報ITクリエイター専門学校', value: 1.05 },
  { name: '外語ビジネス専門学校', value: 1.0 },
  { name: 'グレッグ外語専門学校横浜校', value: 0.95 },
  { name: '大原簿記情報ビジネス専門学校横浜校', value: 0.95 },
  { name: '横浜公務員＆IT会計専門学校', value: 0.9 },
  { name: '大原法律公務員専門学校横浜校', value: 0.85 },
  { name: '横浜システム工学院専門学校', value: 0.85 },
  { name: '横浜日建工科専門学校', value: 0.8 },
  { name: '横浜テクノオート専門学校', value: 0.8 },
  { name: '専門学校日産横浜自動車大学校', value: 0.75 },
  { name: '専門学校神奈川総合大学校', value: 0.75 },
  { name: '浅野工学専門学校', value: 0.7 },
  { name: '柏木実業専門学校', value: 0.7 },
  { name: '日本ガーデンデザイン専門学校', value: 0.7 },
  { name: '専門学校国際新堀芸術学院', value: 0.7 },
  { name: '専門学校横浜ミュージックスクール', value: 0.65 },
  { name: '日本ヒューマンセレモニー専門学校', value: 0.65 },
  { name: 'ヨコスカ調理製菓専門学校', value: 0.65 },
  { name: '横浜調理師専門学校', value: 0.65 },
  { name: '崎村調理師専門学校', value: 0.6 },
  { name: '横須賀法律行政専門学校', value: 0.6 },
  { name: '米山ファッション・ビジネス専門学校', value: 0.6 },
  { name: '日本溶接構造専門学校', value: 0.45 },
];

const REGIONS = [
  { key: 'tokyo', label: '東京エリア', title: '東京エリアの専門学生 参加分布', data: TOKYO, caption: '' },
  { key: 'saitama', label: '埼玉エリア', title: '埼玉エリアの専門学生 参加分布', data: SAITAMA, caption: '' },
  { key: 'chiba', label: '千葉エリア', title: '千葉エリアの専門学生 参加分布', data: CHIBA, caption: '' },
  { key: 'kanagawa', label: '神奈川エリア', title: '神奈川エリアの専門学生 参加分布', data: KANAGAWA, caption: '' },
] as const;

const TRUNCATE_TOP_N = 10;

// このタブのHTMLは常にDOMへ出力する（学校名がクロールされるように）。
// 開閉やエリア切り替えは見た目上のCSS制御のみで行い、円グラフだけ開いた
// タブに限って描画する（非表示要素内だとrechartsが幅0のまま固まるため）。
function RegionPanel({
  region,
  isActiveRegion,
  isSectionOpen,
  showAllSchools,
  onToggleShowAll,
}: {
  region: (typeof REGIONS)[number];
  isActiveRegion: boolean;
  isSectionOpen: boolean;
  showAllSchools: boolean;
  onToggleShowAll: () => void;
}) {
  const { top, rest, othersTotal } = splitTopAndOthers(region.data, TRUNCATE_TOP_N);
  const pieData = othersTotal > 0 ? [...top, { name: 'その他', value: othersTotal }] : top;

  return (
    <div className={isActiveRegion ? '' : 'hidden'}>
      <h2 className="mb-1 text-sm font-bold text-gray-900">{region.title}</h2>
      {region.caption && <p className="mb-3 text-xs leading-relaxed text-gray-700">{region.caption}</p>}

      {isSectionOpen && isActiveRegion && (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
              {pieData.map((slice, i) => (
                <Cell key={slice.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [formatPercent(Number(value)), name]} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        {top.map((slice, i) => (
          <SchoolRow key={slice.name} slice={slice} colorIndex={i} />
        ))}
        {othersTotal > 0 && <SchoolRow slice={{ name: 'その他', value: othersTotal }} colorIndex={top.length} />}
      </ul>

      {rest.length > 0 && (
        <>
          <ul className={`mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 ${showAllSchools ? '' : 'hidden'}`}>
            {rest.map((slice, i) => (
              <SchoolRow key={slice.name} slice={slice} colorIndex={top.length + 1 + i} />
            ))}
          </ul>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onToggleShowAll}
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              {showAllSchools ? '閉じる' : `もっと見る（全${region.data.filter((s) => s.name !== 'その他').length}校）`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BellVocationalSchoolBreakdown({ locked = false }: { locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<(typeof REGIONS)[number]['key']>('tokyo');
  const [showAllSchools, setShowAllSchools] = useState(false);

  return (
    <div className="mt-4">
      {!open && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={locked}
            className="text-sm text-gray-400 underline hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
          >
            もっとみる
          </button>
          {locked && <p className="mt-1 text-[11px] text-gray-400">↑ 大学の参加分布を先にご覧ください</p>}
        </div>
      )}

      {/* 折りたたみ中もHTML自体は出力し、CSSでのみ見た目を隠す（クロール対策） */}
      <div className={open ? 'rounded-2xl border border-gray-200 bg-white p-4' : 'hidden'}>
        {REGIONS.length > 1 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto">
            {REGIONS.map((region) => (
              <button
                key={region.key}
                type="button"
                onClick={() => setActiveRegion(region.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeRegion === region.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        )}

        {REGIONS.map((region) => (
          <RegionPanel
            key={region.key}
            region={region}
            isActiveRegion={activeRegion === region.key}
            isSectionOpen={open}
            showAllSchools={showAllSchools}
            onToggleShowAll={() => setShowAllSchools((v) => !v)}
          />
        ))}

        <p className="mt-3 text-[11px] text-gray-400">※ 過去の参加実績をもとにした概算です</p>
      </div>
    </div>
  );
}
