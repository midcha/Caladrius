import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors, S } from '../../src/styles';
import { readJson } from '../../src/fs';
import { PASSPORT } from '../../src/passportStore';

export default function PatientInfoView() {
  const [passport, setPassport] = useState<any>(null);

  const loadPassportData = useCallback(async () => {
    try {
      const data = await readJson<any>(PASSPORT);
      setPassport(data);
    } catch {
      setPassport(null);
    }
  }, []);

  useEffect(() => {
    loadPassportData();
  }, [loadPassportData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not provided';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  };

  const metaVersion = passport?.version ?? null;
  const metaPassportId = passport?.passportId ?? null;
  const metaIssuedAt = passport?.issuedAt ?? null;
  const metaSource = passport?.source ?? null;

  const idNational = passport?.identifiers?.national ?? null;
  const idInsProvider = passport?.identifiers?.insuranceProvider ?? null;
  const idInsPlanName = passport?.identifiers?.insurancePlanName ?? null;
  const idInsMemberId = passport?.identifiers?.insuranceMemberId ?? null;
  const idInsGroup = passport?.identifiers?.insuranceGroupNumber ?? null;

  const p = passport?.patient ?? {};
  const mh = p?.medicalHistory ?? {};
  const mhPrescriptions = Array.isArray(mh?.prescriptions) ? mh.prescriptions : [];
  const mhAllergies = Array.isArray(mh?.allergies) ? mh.allergies : [];
  const mhEmergency = Array.isArray(mh?.emergencyContacts) ? mh.emergencyContacts : [];
  const mhConditions = Array.isArray(mh?.conditions) ? mh.conditions : [];
  const mhChronic = Array.isArray(mh?.chronicConditions) ? mh.chronicConditions : [];
  const mhVisits = Array.isArray(mh?.visits) ? mh.visits : [];
  const mhFamily = Array.isArray(mh?.familyHistory) ? mh.familyHistory : [];
  const mhInsurance = Array.isArray(mh?.insurance) ? mh.insurance : [];

  const topPrescriptions = Array.isArray(passport?.prescriptions) ? passport.prescriptions : [];
  const topAllergies = Array.isArray(passport?.allergies) ? passport.allergies : [];
  const topEmergency = Array.isArray(passport?.emergencyContacts) ? passport.emergencyContacts : [];
  const topConditions = Array.isArray(passport?.conditions) ? passport.conditions : [];
  const topFamily = Array.isArray(passport?.familyHistory) ? passport.familyHistory : [];
  const topInsurance = Array.isArray(passport?.insurance) ? passport.insurance : [];

  const mergedEmergency = [...topEmergency, ...mhEmergency];
  const mergedAllergies = [...topAllergies, ...mhAllergies];
  const mergedPrescriptions = [...topPrescriptions, ...mhPrescriptions];
  const mergedConditions = [...topConditions, ...mhConditions];
  const mergedFamily = [...topFamily, ...mhFamily];
  const mergedInsurance = [...topInsurance, ...mhInsurance];

  const Dot = () => <Text style={[S.faint, { marginHorizontal: 6 }]}>•</Text>;

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={true}
    >
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        <View style={{ marginBottom: 30, alignItems: 'center' }}>
          <Text style={[S.h1, { textAlign: 'center', marginBottom: 20 }]}>
            Hello, {p?.firstName || 'Patient'} {p?.lastName || ''}
          </Text>
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Basic Information</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Date of Birth:</Text>
              <Text style={S.mono}>{formatDate(p?.dob)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Age:</Text>
              <Text style={S.mono}>{Number.isFinite(p?.age) ? String(p.age) : 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Sex:</Text>
              <Text style={S.mono}>{p?.sex || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Gender:</Text>
              <Text style={S.mono}>{p?.gender || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Blood Type:</Text>
              <Text style={S.mono}>{p?.bloodType || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Ethnicity:</Text>
              <Text style={S.mono}>{p?.ethnicity || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Race:</Text>
              <Text style={S.mono}>{p?.race || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>MRN:</Text>
              <Text style={S.mono}>{p?.mrn || 'Not provided'}</Text>
            </View>
            {p?.ssn ? (
              <>
                <View style={{ height: 1, backgroundColor: colors.line }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={S.faint}>SSN:</Text>
                  <Text style={S.mono}>{p.ssn}</Text>
                </View>
              </>
            ) : null}
            {(p?.contact?.phone || p?.contact?.email) && (
              <>
                <View style={{ height: 8 }} />
                <Text style={[S.faint, { fontFamily: 'SpaceGrotesk_600SemiBold' }]}>Contact</Text>
                {p?.contact?.phone && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={S.faint}>Phone:</Text>
                    <Text style={S.mono}>{p.contact.phone}</Text>
                  </View>
                )}
                {p?.contact?.email && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={S.faint}>Email:</Text>
                    <Text style={S.mono}>{p.contact.email}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Identifiers & Insurance</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Provider:</Text>
              <Text style={S.mono}>{idInsProvider || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Plan Name:</Text>
              <Text style={S.mono}>{idInsPlanName || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Member ID:</Text>
              <Text style={S.mono}>{idInsMemberId || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Group Number:</Text>
              <Text style={S.mono}>{idInsGroup || 'Not provided'}</Text>
            </View>
            {idNational ? (
              <>
                <View style={{ height: 1, backgroundColor: colors.line }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={S.faint}>National ID:</Text>
                  <Text style={S.mono}>{idNational}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Emergency Contacts</Text>
          {mergedEmergency.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No emergency contacts on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mergedEmergency.map((contact: any, index: number) => (
                <View
                  key={`emg-${index}`}
                  style={{
                    paddingBottom: 12,
                    borderBottomWidth: index < mergedEmergency.length - 1 ? 1 : 0,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>
                    {contact?.name || `Contact ${index + 1}`}
                  </Text>
                  {contact?.relationship ? (
                    <Text style={S.faint}>Relationship: <Text style={S.body}>{contact.relationship}</Text></Text>
                  ) : null}
                  {contact?.phone ? (
                    <Text style={S.body}>Phone: <Text style={S.mono}>{contact.phone}</Text></Text>
                  ) : null}
                  {contact?.email ? (
                    <Text style={S.body}>Email: <Text style={S.mono}>{contact.email}</Text></Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Medications</Text>
          {mergedPrescriptions.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No medications on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mergedPrescriptions.map((rx: any, i: number) => {
                const medArray = Array.isArray(rx?.medication) ? rx.medication : [];
                const medInline =
                  medArray.length > 0
                    ? medArray.map((m: any) => [m?.name, m?.strength].filter(Boolean).join(' ')).join(', ')
                    : rx?.medication || '';
                return (
                  <View key={`rx-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mergedPrescriptions.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                    <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>
                      {medInline || 'Medication'}
                    </Text>
                    {rx?.dosage ? <Text style={S.body}>Dosage: <Text style={S.mono}>{rx.dosage}</Text></Text> : null}
                    {rx?.instructions ? <Text style={S.body}>Instructions: <Text style={S.mono}>{rx.instructions}</Text></Text> : null}
                    {(rx?.startDate || rx?.endDate) ? (
                      <Text style={S.faint}>
                        {rx?.startDate ? `Start: ${formatDate(rx.startDate)}` : 'Start: —'} <Dot /> {rx?.endDate ? `End: ${formatDate(rx.endDate)}` : 'End: —'}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Allergies</Text>
          {mergedAllergies.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No allergies on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mergedAllergies.map((a: any, i: number) => (
                <View key={`alg-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mergedAllergies.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>{a?.name || 'Allergy'}</Text>
                  {a?.reaction ? <Text style={S.body}>Reaction: <Text style={S.mono}>{a.reaction}</Text></Text> : null}
                  {a?.severity ? <Text style={S.body}>Severity: <Text style={S.mono}>{a.severity}</Text></Text> : null}
                  {a?.treatment ? <Text style={S.body}>Treatment: <Text style={S.mono}>{a.treatment}</Text></Text> : null}
                  {a?.notes ? <Text style={S.faint}>{a.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Conditions</Text>
          {mergedConditions.length === 0 && mhChronic.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No conditions on file</Text>
          ) : (
            <View style={{ gap: 20 }}>
              {mergedConditions.length > 0 && (
                <View style={{ gap: 12 }}>
                  {mergedConditions.map((c: any, i: number) => (
                    <View key={`cond-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mergedConditions.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                      <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>{c?.name || 'Condition'}</Text>
                      {c?.diagnosis ? <Text style={S.body}>Diagnosis: <Text style={S.mono}>{c.diagnosis}</Text></Text> : null}
                      {c?.status ? <Text style={S.body}>Status: <Text style={S.mono}>{c.status}</Text></Text> : null}
                      {c?.notes ? <Text style={S.faint}>{c.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
              {mhChronic.length > 0 && (
                <View style={{ gap: 12 }}>
                  <Text style={[S.faint, { fontFamily: 'SpaceGrotesk_600SemiBold' }]}>Chronic</Text>
                  {mhChronic.map((c: any, i: number) => (
                    <View key={`ch-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mhChronic.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                      <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>{c?.name || 'Chronic condition'}</Text>
                      {c?.status ? <Text style={S.body}>Status: <Text style={S.mono}>{c.status}</Text></Text> : null}
                      {c?.notes ? <Text style={S.faint}>{c.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Recent Visits</Text>
          {mhVisits.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No visits on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mhVisits.map((v: any, i: number) => (
                <View key={`visit-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mhVisits.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>
                    {v?.purpose || 'Visit'} <Text style={S.faint}>({formatDate(v?.date)})</Text>
                  </Text>
                  {v?.doctor ? <Text style={S.body}>Clinician: <Text style={S.mono}>{v.doctor}</Text></Text> : null}
                  {v?.reason ? <Text style={S.body}>Reason: <Text style={S.mono}>{v.reason}</Text></Text> : null}
                  {v?.notes ? <Text style={S.faint}>{v.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Family History</Text>
          {mergedFamily.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No family history on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mergedFamily.map((fh: any, i: number) => (
                <View key={`fh-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mergedFamily.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>
                    {fh?.relation || 'Relative'}
                  </Text>
                  {fh?.condition ? <Text style={S.body}>Condition: <Text style={S.mono}>{fh.condition}</Text></Text> : null}
                  {fh?.diagnosisAge ? <Text style={S.body}>Diagnosis age: <Text style={S.mono}>{fh.diagnosisAge}</Text></Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[S.card, S.sectionSpacing]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Coverage</Text>
          {mergedInsurance.length === 0 ? (
            <Text style={[S.faint, { fontStyle: 'italic' }]}>No insurance entries on file</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {mergedInsurance.map((ins: any, i: number) => (
                <View key={`ins-${i}`} style={{ paddingBottom: 12, borderBottomWidth: i < mergedInsurance.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <Text style={[S.body, { fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 }]}>
                    {(ins?.providerName || ins?.provider || idInsProvider || 'Provider').toString()}
                  </Text>
                  {ins?.policyNumber ? <Text style={S.body}>Policy #: <Text style={S.mono}>{ins.policyNumber}</Text></Text> : null}
                  {ins?.groupNumber ? <Text style={S.body}>Group #: <Text style={S.mono}>{ins.groupNumber}</Text></Text> : null}
                  {ins?.providerName ? <Text style={S.body}>Plan: <Text style={S.mono}>{ins.providerName}</Text></Text> : null}
                  {(ins?.coverageStart || ins?.coverageEnd !== undefined) ? (
                    <Text style={S.faint}>
                      Start: {ins?.coverageStart ? formatDate(ins.coverageStart) : '—'} <Dot /> End: {ins?.coverageEnd ? formatDate(ins.coverageEnd) : '—'}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[S.card, { marginBottom: 24 }]}>
          <Text style={[S.h2, { marginBottom: 12 }]}>Passport Meta</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Version:</Text>
              <Text style={S.mono}>{metaVersion !== null ? String(metaVersion) : 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Passport ID:</Text>
              <Text style={S.mono}>{metaPassportId || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Issued At:</Text>
              <Text style={S.mono}>{metaIssuedAt ? `${formatDate(metaIssuedAt)}` : 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.faint}>Source:</Text>
              <Text style={S.mono}>{metaSource || 'Not provided'}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
