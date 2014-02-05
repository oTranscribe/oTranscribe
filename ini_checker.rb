require 'iniparse'

data = IniParse.parse( File.read('data.ini') )

# puts data['en']['help']

default = data['en']
missing = {}


data.each do |language|
  if language != default
    missing[language.key] = []
  end
  default.each do |k|
    k = k.key

    if !language[k]
      missing[language.key] << k
    end
  end
end

missing.each do |k,v|
  puts ""
  puts k + " is missing " + v.length.to_s + ":"
  v.each { |x| puts "- " + x }
end